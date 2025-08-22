/**
 * OpenTelemetry 로깅 어댑터 (Winston 기반)
 * 
 * Winston을 사용하여 OpenTelemetry Collector로 로그를 전송하는 어댑터입니다.
 * 기존 LogService와 병행하여 사용하며, Collector 전송 기능을 제공합니다.
 * 
 * 주요 기능:
 * - Winston을 통한 OpenTelemetry Collector 로그 전송
 * - 기존 LogService와의 병행 사용
 * - OpenTelemetry trace 컨텍스트 자동 연동
 * - 구조화된 로그 데이터 생성
 */

import { trace } from '@opentelemetry/api';
import winston from 'winston';
// import { OpenTelemetryTransportV3 } from '@opentelemetry/winston-transport';
import logService from '../services/logService.js';
import axios from 'axios';

// OpenTelemetry trace 컨텍스트 정보를 추출하는 헬퍼 함수
const getTraceContext = () => {
  const currentSpan = trace.getActiveSpan();
  if (!currentSpan) return null;
  
  const spanContext = currentSpan.spanContext();
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    traceFlags: spanContext.traceFlags,
    traceState: spanContext.traceState?.serialize()
  };
};

// Winston에 커스텀 transport 추가 - 파일에 임시 저장 후 전송
import { createWriteStream } from 'fs';
const logStream = createWriteStream('/dev/null'); // 실제로는 사용하지 않음

class OTLPTransport extends winston.transports.Stream {
  constructor() {
    super({ stream: logStream });
  }
  
  log(info: any, callback: () => void) {
    setImmediate(() => {
      sendLogToOTLP(info);
    });
    callback();
  }
}

// Winston 로거 생성
const createWinstonLogger = () => {
  // OpenTelemetry trace 정보를 포함하는 커스텀 포맷
  const otelFormat = winston.format.printf((info: any) => {
    const { level, message, timestamp, ...meta } = info;
    const traceContext = getTraceContext();
    
    const logData = {
      timestamp,
      level,
      message,
      service: 'mcphub-backend',
      version: process.env.npm_package_version || 'dev',
      trace: traceContext,
      ...meta
    };
    
    return JSON.stringify(logData);
  });

  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      otelFormat
    ),
    transports: [
      // 콘솔 출력 (기존과 동일)
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }),
      // OTLP Transport 추가
      new OTLPTransport()
    ]
  });
};

// Winston 로거 인스턴스 생성
const winstonLogger = createWinstonLogger();

// Winston 메모리 저장소 (최근 1000개 로그)
const memoryStore: any[] = [];

// Winston 메모리 저장소에 로그 추가하는 함수
const addToMemoryStore = (logEntry: any) => {
  memoryStore.push(logEntry);
  // 최대 1000개만 유지
  if (memoryStore.length > 1000) {
    memoryStore.shift();
  }
};

// 메모리 저장소에서 로그 조회하는 함수
export const getMemoryLogs = () => {
  return [...memoryStore];
};

// 기존 LogService의 addLog 메소드를 안전하게 확장
const originalAddLog = (logService as any).addLog;
if (originalAddLog && typeof originalAddLog === 'function') {
  (logService as any).addLog = function(
    type: 'info' | 'error' | 'warn' | 'debug',
    source: string,
    message: string,
    processId?: string
  ) {
    // OpenTelemetry trace 컨텍스트 정보 추가
    const traceContext = getTraceContext();
    const enhancedMessage = traceContext 
      ? `${message} [traceId:${traceContext.traceId} spanId:${traceContext.spanId}]`
      : message;
    
    // Winston을 통해 Collector로 로그 전송 및 메모리 저장
    const winstonLevel = type === 'debug' ? 'debug' : type;
    const logData = {
      source,
      processId,
      traceContext,
      timestamp: new Date().toISOString()
    };
    
    winstonLogger.log(winstonLevel, enhancedMessage, logData);
    
    // 메모리 저장소에도 추가 (Winston과 동일한 데이터)
    addToMemoryStore({
      timestamp: new Date(logData.timestamp).getTime(), // number로 변환
      type: type, // level -> type으로 변경
      source,
      message: enhancedMessage,
      processId,
      traceContext
    });
    
    // OpenTelemetry span에 로그 이벤트 추가
    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.addEvent('log', {
        level: type,
        source,
        message,
        processId
      });
      
      // 에러인 경우 span 상태 업데이트
      if (type === 'error') {
        currentSpan.setStatus({ code: 2, message: 'Log error occurred' });
      }
    }
  };
} else {
  // addLog 메소드가 없는 경우 Winston만 사용
  console.log('OpenTelemetry Logger: LogService.addLog not found, using Winston only');
}

// OpenTelemetry와 연동된 로깅 헬퍼 함수들
export const otelLog = {
  info: (message: string, source = 'main', processId?: string) => {
    winstonLogger.info(message, { source, processId });
  },
  
  error: (message: string, error?: Error, source = 'main', processId?: string) => {
    const errorMessage = error ? `${message}: ${error.message}` : message;
    winstonLogger.error(errorMessage, { source, processId, error });
    
    // OpenTelemetry span에 예외 기록
    const currentSpan = trace.getActiveSpan();
    if (currentSpan && error) {
      currentSpan.recordException(error);
      currentSpan.setStatus({ code: 2, message: error.message });
    }
  },
  
  warn: (message: string, source = 'main', processId?: string) => {
    winstonLogger.warn(message, { source, processId });
  },
  
  debug: (message: string, source = 'main', processId?: string) => {
    winstonLogger.debug(message, { source, processId });
  }
};

// 구조화된 로그 데이터를 생성하는 함수
export const createStructuredLog = (level: string, message: string, meta?: any) => {
  const traceContext = getTraceContext();
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: 'mcphub-backend',
    version: process.env.npm_package_version || 'dev',
    trace: traceContext,
    ...meta
  };
};

// OpenTelemetry 컨텍스트를 사용하여 로그를 기록하는 함수
export const logWithContext = (level: string, message: string, meta?: any) => {
  const structuredLog = createStructuredLog(level, message, meta);
  
  // Winston을 통해 로그 기록
  winstonLogger.log(level, message, meta);
  
  // OpenTelemetry span에 이벤트 추가
  const currentSpan = trace.getActiveSpan();
  if (currentSpan) {
    currentSpan.addEvent('structured_log', structuredLog);
  }
};

// OTLP 로그 전송 함수
const sendLogToOTLP = async (logRecord: any) => {
  const OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
  const OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'mcphub-backend';
  
  try {
    const otlpLogRecord = {
      resourceLogs: [{
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: OTEL_SERVICE_NAME } },
            { key: 'service.version', value: { stringValue: process.env.npm_package_version || 'dev' } }
          ]
        },
        scopeLogs: [{
          scope: {
            name: 'mcphub-logger',
            version: '1.0.0'
          },
          logRecords: [{
            timeUnixNano: (Date.now() * 1000000).toString(),
            severityNumber: getSeverityNumber(logRecord.level),
            severityText: logRecord.level?.toUpperCase() || 'INFO',
            body: { stringValue: logRecord.message },
            attributes: [
              ...(logRecord.source ? [{ key: 'source', value: { stringValue: logRecord.source } }] : []),
              ...(logRecord.processId ? [{ key: 'processId', value: { stringValue: logRecord.processId } }] : []),
              ...(logRecord.traceContext ? [
                { key: 'trace_id', value: { stringValue: logRecord.traceContext.traceId } },
                { key: 'span_id', value: { stringValue: logRecord.traceContext.spanId } }
              ] : [])
            ],
            ...(logRecord.traceContext ? {
              traceId: hexToBase64(logRecord.traceContext.traceId),
              spanId: hexToBase64(logRecord.traceContext.spanId)
            } : {})
          }]
        }]
      }]
    };

    await axios.post(`${OTEL_ENDPOINT}/v1/logs`, otlpLogRecord, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
  } catch (error: any) {
    // 로그 전송 실패 시 콘솔에만 출력 (무한 루프 방지)
    console.error('Failed to send log to OTLP:', error?.message || error);
  }
};

// Severity 레벨 변환
const getSeverityNumber = (level: string): number => {
  const severityMap: { [key: string]: number } = {
    'debug': 5,
    'info': 9,
    'warn': 13,
    'error': 17
  };
  return severityMap[level?.toLowerCase()] || 9;
};

// Hex to Base64 변환 (trace/span ID용)
const hexToBase64 = (hex: string): string => {
  const buffer = Buffer.from(hex, 'hex');
  return buffer.toString('base64');
};

// 초기화 완료 로그
console.log('OpenTelemetry Winston Logger Adapter with OTLP Transport initialized successfully');

export default {
  winstonLogger,
  otelLog,
  createStructuredLog,
  logWithContext,
  getTraceContext
};