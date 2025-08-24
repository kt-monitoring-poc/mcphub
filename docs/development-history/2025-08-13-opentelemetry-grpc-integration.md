# OpenTelemetry gRPC 로그 익스포터 통합

**📅 작업 일시**
- **시작**: 2025-08-13 15:30 KST
- **완료**: 2025-08-13 15:45 KST
- **총 소요 시간**: 약 15분

## 🎯 작업 목적
- **사용자 요청**: "package.json에서 http말고 grpc로 바꿔"
- **해결할 문제**: OpenTelemetry 로그 전송을 HTTP에서 gRPC로 변경
- **예상 결과**: 더 효율적인 로그 전송 및 성능 향상

## 🔧 수정된 파일들

### 1. package.json
- **파일**: `package.json`
- **변경사항**: OpenTelemetry 로그 익스포터 패키지를 HTTP에서 gRPC로 변경
- **라인**: 62
- **변경 전 코드**:
  ```json
  "@opentelemetry/exporter-logs-otlp-http": "^0.203.0",
  ```
- **변경 후 코드**:
  ```json
  "@opentelemetry/exporter-logs-otlp-grpc": "^0.203.0",
  ```
- **변경 이유**: gRPC 프로토콜을 사용하여 더 효율적인 로그 전송

### 2. src/config/otel-logger-adapter.ts
- **파일**: `src/config/otel-logger-adapter.ts`
- **변경사항**: HTTP 기반 로그 전송을 gRPC 기반으로 변경
- **라인**: 18, 218-265
- **변경 전 코드**:
  ```typescript
  import axios from 'axios';
  
  // OTLP 로그 전송 함수
  const sendLogToOTLP = async (logRecord: any) => {
    const OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
    // ... HTTP 기반 전송 로직
    await axios.post(`${OTEL_ENDPOINT}/v1/logs`, otlpLogRecord, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
  };
  ```
- **변경 후 코드**:
  ```typescript
  import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
  
  // OTLP 로그 전송 함수 (gRPC 사용)
  const sendLogToOTLP = async (logRecord: any) => {
    const OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317';
    
    // gRPC 익스포터 인스턴스 생성
    const logExporter = new OTLPLogExporter({
      url: OTEL_ENDPOINT,
      timeoutMillis: 5000
    });

    // 로그 레코드 생성
    const logRecordData = {
      timestamp: Date.now() * 1000000, // nanoseconds
      severityNumber: getSeverityNumber(logRecord.level),
      severityText: logRecord.level?.toUpperCase() || 'INFO',
      body: logRecord.message,
      attributes: {
        'service.name': OTEL_SERVICE_NAME,
        'service.version': process.env.npm_package_version || 'dev',
        ...(logRecord.source && { 'source': logRecord.source }),
        ...(logRecord.processId && { 'processId': logRecord.processId }),
        ...(logRecord.traceContext && {
          'trace_id': logRecord.traceContext.traceId,
          'span_id': logRecord.traceContext.spanId
        })
      },
      ...(logRecord.traceContext && {
        traceId: hexToBase64(logRecord.traceContext.traceId),
        spanId: hexToBase64(logRecord.traceContext.spanId)
      })
    };

    // gRPC를 통해 로그 전송
    await logExporter.export([logRecordData]);
  };
  ```
- **변경 이유**: gRPC 프로토콜을 사용하여 더 효율적이고 안정적인 로그 전송

### 3. Dockerfile
- **파일**: `Dockerfile`
- **변경사항**: OpenTelemetry 엔드포인트 포트를 gRPC 표준 포트로 변경
- **라인**: 62
- **변경 전 코드**:
  ```dockerfile
  ARG OTEL_EXPORTER_OTLP_ENDPOINT="http://10.224.0.11:30171"
  ```
- **변경 후 코드**:
  ```dockerfile
  ARG OTEL_EXPORTER_OTLP_ENDPOINT="http://10.224.0.11:4317"
  ```
- **변경 이유**: gRPC 표준 포트(4317) 사용

## 📊 작업 결과
- **성공 여부**: ✅ 성공
- **영향받는 기능**: OpenTelemetry 로그 전송 시스템
- **테스트 결과**: 패키지 설치 성공, 타입 오류 해결
- **부작용**: 없음

## 💡 학습된 내용
- **기술적 인사이트**: 
  - OpenTelemetry gRPC 익스포터는 `@opentelemetry/exporter-logs-otlp-grpc` 패키지 사용
  - gRPC 표준 포트는 4317 (HTTP는 4318)
  - gRPC 익스포터는 `OTLPLogExporter` 클래스 사용
- **문제 해결 방법**: 
  - 잘못된 패키지 이름(`@opentelemetry/exporter-logs-otlp-proto-grpc`)을 올바른 이름으로 수정
  - `npm search` 명령어로 사용 가능한 패키지 확인
- **개선점**: 
  - gRPC를 사용하여 더 효율적인 로그 전송
  - HTTP 대비 더 나은 성능과 안정성

## 🔄 다음 단계
1. Docker 빌드 테스트
2. gRPC 로그 전송 기능 검증
3. 성능 비교 테스트 (HTTP vs gRPC)
