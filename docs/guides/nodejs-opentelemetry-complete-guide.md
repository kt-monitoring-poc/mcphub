# Node.js 애플리케이션을 위한 OpenTelemetry 완전 가이드
## Loki (로그), Tempo (트레이스), Mimir (메트릭) 통합

> 🎯 **핵심 목표**: Node.js/TypeScript 애플리케이션에서 OpenTelemetry를 사용하여 로그, 트레이스, 메트릭을 각각 Loki, Tempo, Mimir에 저장하는 완전한 구현 가이드

## 📋 목차
1. [개요](#개요)
2. [아키텍처](#아키텍처)
3. [구현 단계](#구현-단계)
4. [로그 수집 (Winston → Loki)](#로그-수집-winston--loki)
5. [트레이스 수집 (Auto-instrumentation → Tempo)](#트레이스-수집-auto-instrumentation--tempo)
6. [테스트 및 검증](#테스트-및-검증)
7. [트러블슈팅](#트러블슈팅)
8. [베스트 프랙티스](#베스트-프랙티스)

## 개요

### OpenTelemetry의 3대 요소
1. **Logs (로그)**: 애플리케이션의 이벤트 기록
2. **Traces (트레이스)**: 요청의 전체 흐름 추적
3. **Metrics (메트릭)**: 시스템 성능 지표 (CPU, 메모리 등)

### 왜 로그는 별도 구현이 필요한가?
- **Auto-instrumentation의 한계**: 
  - ✅ 자동 캡처: HTTP 요청/응답, DB 쿼리, 외부 API 호출
  - ❌ 자동 캡처 불가: console.log(), Winston/Bunyan 등 애플리케이션 로거
- **해결책**: Winston Transport를 통한 OTLP 로그 전송

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    Node.js Application                       │
│                                                              │
│  ┌─────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │   Winston   │  │ Auto-instrument  │  │   Metrics     │  │
│  │   Logger    │  │    (Traces)      │  │  (Future)     │  │
│  └──────┬──────┘  └────────┬─────────┘  └───────┬───────┘  │
│         │                   │                     │          │
│  ┌──────▼──────────────────▼─────────────────────▼───────┐  │
│  │           OpenTelemetry SDK & Exporters               │  │
│  └───────────────────────┬───────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │ OTLP/HTTP
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              OpenTelemetry Collector (K8s)                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   Receiver  │  │  Processor   │  │    Exporter     │   │
│  │    (OTLP)   │  │ (Attributes) │  │  (Loki/Tempo)   │   │
│  └─────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
    ┌─────────┐     ┌─────────┐     ┌─────────┐
    │  Loki   │     │  Tempo  │     │  Mimir  │
    │ (Logs)  │     │(Traces) │     │(Metrics)│
    └─────────┘     └─────────┘     └─────────┘
         │                │                │
         └────────────────┼────────────────┘
                          ▼
                    ┌─────────┐
                    │ Grafana │
                    └─────────┘
```

## 구현 단계

### 1. 패키지 설치

```bash
# OpenTelemetry 자동 계측 (트레이스)
pnpm add @opentelemetry/api @opentelemetry/auto-instrumentations-node

# Winston 로깅
pnpm add winston

# 타입 정의
pnpm add -D @types/winston
```

### 2. 환경변수 설정

```bash
# .env 파일
OTEL_TRACES_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=http://your-collector-endpoint
OTEL_SERVICE_NAME=your-service-name
NODE_OPTIONS=--require @opentelemetry/auto-instrumentations-node/register
```

### 3. TypeScript 프로젝트 설정

```json
// package.json
{
  "type": "module",
  "scripts": {
    "start": "node dist/index.js",
    "build": "tsc"
  }
}
```

## 로그 수집 (Winston → Loki)

### 1. Winston Transport 구현

**파일**: `src/config/otel-logger-adapter.ts`

```typescript
import { trace, context } from '@opentelemetry/api';
import winston from 'winston';
import { createWriteStream } from 'fs';
import axios from 'axios';

// Trace context 추출
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

// OTLP 로그 전송 함수
const sendLogToOTLP = async (logRecord: any) => {
  const OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
  const OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'my-service';
  
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
            name: 'winston-logger',
            version: '1.0.0'
          },
          logRecords: [{
            timeUnixNano: (Date.now() * 1000000).toString(),
            severityNumber: getSeverityNumber(logRecord.level),
            severityText: logRecord.level?.toUpperCase() || 'INFO',
            body: { stringValue: logRecord.message },
            attributes: [
              ...(logRecord.source ? [{ key: 'source', value: { stringValue: logRecord.source } }] : []),
              ...(logRecord.traceContext ? [
                { key: 'trace_id', value: { stringValue: logRecord.traceContext.traceId } },
                { key: 'span_id', value: { stringValue: logRecord.traceContext.spanId } }
              ] : [])
            ],
            ...(logRecord.traceContext ? {
              traceId: logRecord.traceContext.traceId,
              spanId: logRecord.traceContext.spanId
            } : {})
          }]
        }]
      }]
    };

    await axios.post(`${OTEL_ENDPOINT}/v1/logs`, otlpLogRecord, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
  } catch (error: any) {
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

// Winston Transport 클래스
const logStream = createWriteStream('/dev/null');
class OTLPTransport extends winston.transports.Stream {
  constructor() {
    super({ stream: logStream });
  }
  
  log(info: any, callback: Function) {
    setImmediate(() => {
      sendLogToOTLP(info);
    });
    callback();
  }
}

// Winston 로거 생성
const createWinstonLogger = () => {
  const otelFormat = winston.format.printf((info: any) => {
    const { level, message, timestamp, ...meta } = info;
    const traceContext = getTraceContext();
    
    const logData = {
      timestamp,
      level,
      message,
      service: process.env.OTEL_SERVICE_NAME || 'my-service',
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
      // 콘솔 출력
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }),
      // OTLP 전송
      new OTLPTransport()
    ]
  });
};

// 로거 인스턴스 생성
const logger = createWinstonLogger();

// 헬퍼 함수들
export const otelLog = {
  info: (message: string, meta?: any) => {
    logger.info(message, meta);
  },
  
  error: (message: string, error?: Error, meta?: any) => {
    const errorMessage = error ? `${message}: ${error.message}` : message;
    logger.error(errorMessage, { ...meta, error });
  },
  
  warn: (message: string, meta?: any) => {
    logger.warn(message, meta);
  },
  
  debug: (message: string, meta?: any) => {
    logger.debug(message, meta);
  }
};

export default logger;
```

### 2. 애플리케이션에서 사용

```typescript
// src/index.ts
import 'reflect-metadata';
import './config/otel-logger-adapter.js'; // OpenTelemetry 로깅 초기화
import { otelLog } from './config/otel-logger-adapter.js';

// 로그 사용 예시
otelLog.info('Application started', { version: '1.0.0' });
otelLog.error('Database connection failed', new Error('Connection timeout'));
```

## 트레이스 수집 (Auto-instrumentation → Tempo)

### 1. 자동 계측 설정

트레이스는 환경변수 설정만으로 자동 수집됩니다:

```bash
# 애플리케이션 시작
NODE_OPTIONS="--require @opentelemetry/auto-instrumentations-node/register" \
OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4318 \
OTEL_SERVICE_NAME=my-service \
OTEL_TRACES_EXPORTER=otlp \
node dist/index.js
```

### 2. 자동으로 캡처되는 항목
- HTTP 요청/응답 (Express, Fastify 등)
- 데이터베이스 쿼리 (PostgreSQL, MySQL, MongoDB 등)
- 외부 API 호출 (axios, fetch 등)
- Redis 작업
- gRPC 호출

## 테스트 및 검증

### 1. 로그 테스트

```javascript
// test-logs.js
import axios from 'axios';

const OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const testId = Date.now().toString();

// OTLP 로그 직접 전송 테스트
const otlpLogRecord = {
  resourceLogs: [{
    resource: {
      attributes: [
        { key: 'service.name', value: { stringValue: 'test-service' } },
        { key: 'test.id', value: { stringValue: testId } }
      ]
    },
    scopeLogs: [{
      scope: { name: 'test-logger', version: '1.0.0' },
      logRecords: [{
        timeUnixNano: (Date.now() * 1000000).toString(),
        severityNumber: 9,
        severityText: 'INFO',
        body: { stringValue: `Test log message - ID: ${testId}` }
      }]
    }]
  }]
};

const response = await axios.post(`${OTEL_ENDPOINT}/v1/logs`, otlpLogRecord, {
  headers: { 'Content-Type': 'application/json' }
});

console.log('✅ Log sent:', response.status);
console.log('🔍 Search in Loki:', `{service_name="test-service"} |= "${testId}"`);
```

### 2. 트레이스 테스트

```javascript
// test-traces.js
import axios from 'axios';

const OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const traceId = generateId(32); // 32자리 hex
const spanId = generateId(16);  // 16자리 hex

const otlpTraceRecord = {
  resourceSpans: [{
    resource: {
      attributes: [
        { key: 'service.name', value: { stringValue: 'test-service' } }
      ]
    },
    scopeSpans: [{
      scope: { name: 'test-tracer', version: '1.0.0' },
      spans: [{
        traceId: traceId,
        spanId: spanId,
        name: 'test-operation',
        kind: 1, // SPAN_KIND_SERVER
        startTimeUnixNano: ((Date.now() - 1000) * 1000000).toString(),
        endTimeUnixNano: (Date.now() * 1000000).toString(),
        attributes: [
          { key: 'http.method', value: { stringValue: 'GET' } },
          { key: 'http.route', value: { stringValue: '/api/test' } }
        ],
        status: { code: 1 } // STATUS_CODE_OK
      }]
    }]
  }]
};

const response = await axios.post(`${OTEL_ENDPOINT}/v1/traces`, otlpTraceRecord, {
  headers: { 'Content-Type': 'application/json' }
});

console.log('✅ Trace sent:', response.status);
console.log('🔍 Trace ID:', traceId);

function generateId(length) {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
```

### 3. Grafana에서 확인

#### Loki 쿼리 예시
```
# 서비스별 로그
{service_name="my-service"}

# 에러 로그만
{service_name="my-service"} |= "error"

# 특정 trace ID로 필터
{service_name="my-service"} |= "traceId:abc123"
```

#### Tempo 쿼리
- Trace ID로 직접 검색
- 서비스명으로 필터
- 시간 범위로 검색

## 트러블슈팅

### 1. Winston Transport 오류

**문제**: `options.stream is required`
```javascript
// 해결: Stream transport 사용 시 stream 객체 필요
import { createWriteStream } from 'fs';
const logStream = createWriteStream('/dev/null');

class OTLPTransport extends winston.transports.Stream {
  constructor() {
    super({ stream: logStream });
  }
}
```

### 2. ESM 모듈 오류

**문제**: `require() of ES Module not supported`
```json
// 해결: package.json에 type 설정
{
  "type": "module"
}
```

### 3. Collector 연결 실패

**문제**: Connection refused
```bash
# 해결 1: DNS 확인 (로컬 개발)
echo "192.168.1.100 collector.local" >> /etc/hosts

# 해결 2: 올바른 엔드포인트 확인
OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4318  # 포트 4318
```

## 베스트 프랙티스

### 1. 로그 구조화
```typescript
// 좋은 예
logger.info('User login successful', {
  userId: user.id,
  username: user.username,
  ip: request.ip,
  userAgent: request.headers['user-agent']
});

// 나쁜 예
logger.info(`User ${user.username} logged in from ${request.ip}`);
```

### 2. 에러 처리
```typescript
try {
  await database.connect();
} catch (error) {
  // trace context가 자동으로 포함됨
  otelLog.error('Database connection failed', error, {
    host: config.db.host,
    port: config.db.port
  });
}
```

### 3. 성능 최적화
- 배치 처리: 로그를 버퍼링하여 일괄 전송
- 비동기 처리: `setImmediate` 사용으로 메인 스레드 블로킹 방지
- 타임아웃 설정: 네트워크 지연 시 애플리케이션 영향 최소화

### 4. 보안
- 민감정보 마스킹: 비밀번호, 토큰 등 로그에서 제외
- 환경변수 사용: 하드코딩된 엔드포인트 금지

## 마이그레이션 가이드

### 기존 console.log 마이그레이션
```typescript
// Before
console.log('Server started on port 3000');
console.error('Failed to connect:', error);

// After
import { otelLog } from './config/otel-logger-adapter.js';

otelLog.info('Server started', { port: 3000 });
otelLog.error('Failed to connect', error);
```

### 기존 Winston 로거 확장
```typescript
// 기존 Winston 로거에 OTLP Transport 추가
existingLogger.add(new OTLPTransport());
```

## 참고 자료

### 공식 문서
- [OpenTelemetry Node.js](https://opentelemetry.io/docs/languages/js/)
- [OTLP Specification](https://opentelemetry.io/docs/specs/otlp/)
- [Winston Documentation](https://github.com/winstonjs/winston)

### 관련 프로젝트 문서
- [MCPHub OpenTelemetry 통합](../development-history/2025-01-12-opentelemetry-integration.md)
- [Winston Transport 구현](../development-history/2025-01-20-opentelemetry-winston-transport-implementation.md)

---

**작성일**: 2025-01-20  
**버전**: 1.0.0  
**작성자**: AI Assistant
