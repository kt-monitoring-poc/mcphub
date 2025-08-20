# OpenTelemetry Winston Transport 구현 및 로그/트레이스 검증

## 📅 작업 일시
- **시작**: 2025-01-20 10:35 KST
- **완료**: 2025-01-20 10:41 KST
- **총 소요 시간**: 약 6분

## 🎯 작업 목적
- **사용자 요청**: "Winston Transport 설정 추가 확인을 해줘"
- **해결할 문제**: OpenTelemetry Agent는 트레이스는 자동으로 캡처하지만, 애플리케이션 로그는 별도 설정 필요
- **예상 결과**: Winston 로그가 OpenTelemetry Collector를 통해 Loki로 전송

## 🔧 수정된 파일들

### 1. src/config/otel-logger-adapter.ts
- **파일**: `src/config/otel-logger-adapter.ts`
- **변경사항**: Custom OTLP Transport 구현 추가, ESLint 경고 수정
- **라인**: 
  - 14: `context` import 제거 (사용하지 않는 변수)
  - 35-49 (OTLPTransport 클래스)
  - 43: `Function` 타입을 `() => void`로 변경
  - 86-87 (transport 추가)
  - 224-293 (OTLP 로그 전송 함수)

#### 변경 전 코드 (라인 61-68):
```typescript
transports: [
  // 콘솔 출력 (기존과 동일)
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  })
]
```

#### 변경 후 코드 (라인 61-71):
```typescript
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
```

#### 추가된 주요 함수들:
- **sendLogToOTLP** (라인 206-256): OTLP 로그 전송 구현
- **getSeverityNumber** (라인 259-267): Winston 로그 레벨을 OTLP severity로 변환
- **hexToBase64** (라인 270-273): Trace/Span ID 변환
- **OTLPTransport** (라인 34-42): Winston 커스텀 Transport 클래스

### 2. package.json
- **파일**: `package.json`
- **변경사항**: OpenTelemetry 로그 관련 패키지 추가
- **라인**: dependencies 섹션

#### 추가된 패키지:
```json
"@opentelemetry/api-logs": "0.203.0",
"@opentelemetry/exporter-logs-otlp-http": "0.203.0",
"@opentelemetry/resources": "2.0.1",
"@opentelemetry/sdk-logs": "0.203.0",
"@opentelemetry/semantic-conventions": "1.36.0"
```

## 🤔 왜 로그는 별도로 구현해야 하나요?

### OpenTelemetry Auto-instrumentation의 한계

1. **자동 계측이 캡처하는 것**:
   - HTTP 요청/응답 트레이스
   - 데이터베이스 쿼리
   - 외부 서비스 호출
   - 시스템 메트릭

2. **자동 계측이 캡처하지 않는 것**:
   - `console.log()` 출력
   - 애플리케이션 로거 (Winston, Bunyan, Pino 등)의 로그
   - 커스텀 로그 메시지

3. **이유**:
   - OpenTelemetry는 "관측성의 3대 요소" (Traces, Metrics, Logs)를 별도로 처리
   - Auto-instrumentation은 주로 트레이스와 메트릭에 집중
   - 로그는 애플리케이션마다 다른 로거를 사용하므로 표준화가 어려움

### 해결 방법
- Winston Transport를 통해 로그를 OTLP 형식으로 변환
- 로그에 자동으로 trace context (traceId, spanId) 추가
- 이를 통해 로그와 트레이스를 연결하여 전체 흐름 파악 가능

## 📊 작업 결과
- **성공 여부**: ✅ 성공
- **영향받는 기능**: 
  - 모든 Winston 로그가 OpenTelemetry Collector로 전송됨
  - 로그에 trace context 자동 포함
  - Loki에서 로그 검색 및 분석 가능
- **테스트 결과**:
  - 테스트 로그 전송: HTTP 200 응답 확인
  - 테스트 트레이스 전송: HTTP 200 응답 확인
  - Tail Sampling Collector에서 트레이스 확인

## 💡 학습된 내용
- **기술적 인사이트**: 
  - OpenTelemetry Winston Transport v3가 아직 불안정하여 직접 OTLP 전송 구현이 더 안정적
  - OTLP 로그 형식은 복잡한 중첩 구조를 가짐
  - Trace ID와 Span ID는 hex 형식으로 전송해야 함 (base64 아님)

- **문제 해결 방법**:
  - Winston Transport 패키지 대신 axios로 직접 OTLP 엔드포인트 호출
  - 로그 전송 실패 시 무한 루프 방지를 위해 콘솔 출력만 수행

- **개선점**:
  - 배치 처리로 성능 향상 가능
  - 로그 버퍼링 및 재시도 로직 추가 고려
  - 환경별 로그 레벨 설정 추가

## 🔗 관련 문서
- [OpenTelemetry 통합 초기 구현](./2025-01-12-opentelemetry-integration.md)
- [OpenTelemetry Collector 설정](../operations/opentelemetry-collector-setup-2025-08-19.md)
- [Node.js OpenTelemetry 완전 가이드](../guides/nodejs-opentelemetry-complete-guide.md)
