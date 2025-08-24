/**
 * OpenTelemetry 로깅 어댑터 (Winston 기반, gRPC 전용)
 *
 * - Winston → OpenTelemetryTransportV3 → OTLP gRPC(4317)
 * - 커스텀 HTTP 전송(axios) 제거
 * - Trace 컨텍스트( traceId/spanId ) 메타 부착 유지
 */

import winston from 'winston';
import { trace } from '@opentelemetry/api';
import { OpenTelemetryTransportV3 } from '@opentelemetry/winston-transport';
import logService from '../services/logService.js';

// ───────────────────────────────────────────────────────────────────────────────
// 트레이스 컨텍스트 헬퍼
// ───────────────────────────────────────────────────────────────────────────────
const getTraceContext = () => {
  const span = trace.getActiveSpan();
  if (!span) return undefined;
  const sc = span.spanContext();
  return { traceId: sc.traceId, spanId: sc.spanId };
};

// ───────────────────────────────────────────────────────────────────────────────
// Winston 로거 (Console + OTEL gRPC Transport)
// ───────────────────────────────────────────────────────────────────────────────
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json() // 구조화 출력 (Grafana/Loki 보기 좋음)
  ),
  transports: [
    new winston.transports.Console(),
    // gRPC 전송(4317). 환경변수(OTEL_*)로 Exporter/Endpoint/Resource를 읽어감.
    new OpenTelemetryTransportV3(),
  ],
});

// ───────────────────────────────────────────────────────────────────────────────
// 기존 LogService 확장 ( monkey patch )
// ───────────────────────────────────────────────────────────────────────────────
const memoryStore: any[] = [];
const addToMemoryStore = (logEntry: any) => {
  memoryStore.push(logEntry);
  if (memoryStore.length > 1000) memoryStore.shift();
};
export const getMemoryLogs = () => [...memoryStore];

const originalAddLog = (logService as any).addLog;
if (originalAddLog && typeof originalAddLog === 'function') {
  (logService as any).addLog = function(
    type: 'info' | 'error' | 'warn' | 'debug',
    source: string,
    message: string,
    processId?: string
  ) {
    const tc = getTraceContext();
    const enhanced = tc ? `${message} [traceId:${tc.traceId} spanId:${tc.spanId}]` : message;

    const level = type === 'debug' ? 'debug' : type;
    const meta = { source, processId, traceContext: tc };

    // Console + OTEL(gRPC) 둘 다 전송
    winstonLogger.log(level, enhanced, meta);

    addToMemoryStore({
      timestamp: Date.now(),
      type,
      source,
      message: enhanced,
      processId,
      traceContext: tc,
    });

    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent('log', { level: type, source, message, processId });
      if (type === 'error') span.setStatus({ code: 2, message: 'Log error occurred' });
    }
  };
} else {
  console.log('OpenTelemetry Logger: LogService.addLog not found, using Winston only');
}

// ───────────────────────────────────────────────────────────────────────────────
// 외부 사용 헬퍼
// ───────────────────────────────────────────────────────────────────────────────
export const otelLog = {
  info: (message: string, source = 'main', processId?: string) =>
    winstonLogger.info(message, { source, processId }),

  error: (message: string, error?: Error, source = 'main', processId?: string) => {
    const msg = error ? `${message}: ${error.message}` : message;
    winstonLogger.error(msg, { source, processId, error });
    const span = trace.getActiveSpan();
    if (span && error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
    }
  },

  warn: (message: string, source = 'main', processId?: string) =>
    winstonLogger.warn(message, { source, processId }),

  debug: (message: string, source = 'main', processId?: string) =>
    winstonLogger.debug(message, { source, processId }),
};

export const createStructuredLog = (level: string, message: string, meta?: any) => ({
  timestamp: new Date().toISOString(),
  level,
  message,
  service: 'mcphub-backend',
  version: process.env.npm_package_version || 'dev',
  trace: getTraceContext(),
  ...meta,
});

export const logWithContext = (level: string, message: string, meta?: any) => {
  winstonLogger.log(level, message, meta);
  const span = trace.getActiveSpan();
  if (span) span.addEvent('structured_log', createStructuredLog(level, message, meta));
};

export default {
  winstonLogger,
  otelLog,
  createStructuredLog,
  logWithContext,
  getTraceContext,
};