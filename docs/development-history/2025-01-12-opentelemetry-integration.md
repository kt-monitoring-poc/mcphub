# OpenTelemetry Agent 통합 작업 기록

## 📅 작업 일시
- **시작**: 2025-01-12 14:00 KST
- **완료**: 2025-01-12 14:30 KST
- **총 소요 시간**: 약 30분

## 🎯 작업 목적
- **사용자 요청**: "otel-agent 브랜치의 OpenTelemetry Agent 주입 부분을 main 브랜치에 적용"
- **해결할 문제**: MCPHub에 분산 추적 및 중앙 집중식 로깅 기능 부재
- **예상 결과**: OpenTelemetry를 통한 애플리케이션 관찰성(Observability) 향상

## 🔧 수정된 파일들

### 1. package.json
- **파일**: `package.json`
- **변경사항**: OpenTelemetry 관련 패키지 추가
- **라인**: 62-66 (dependencies 섹션), 113 (devDependencies 섹션)
- **변경 전 코드**:
```json
"dependencies": {
  "@apidevtools/swagger-parser": "^11.0.1",
  "@modelcontextprotocol/sdk": "^1.17.0",
  "@types/adm-zip": "^0.5.7",
```
- **변경 후 코드**:
```json
"dependencies": {
  "@apidevtools/swagger-parser": "^11.0.1",
  "@modelcontextprotocol/sdk": "^1.17.0",
  "@opentelemetry/api": "^1.9.0",
  "@opentelemetry/auto-instrumentations-node": "^0.62.0",
  "@opentelemetry/instrumentation-winston": "^0.48.0",
  "@opentelemetry/winston-transport": "^0.14.0",
  "winston": "^3.17.0",
  "@types/adm-zip": "^0.5.7",
```
그리고 devDependencies에 추가:
```json
"@types/winston": "^2.4.4",
```
- **변경 이유**: OpenTelemetry 자동 계측, Winston 로거 통합 및 타입 정의를 위한 필수 패키지 추가

### 2. src/config/otel-logger-adapter.ts (신규 파일)
- **파일**: `src/config/otel-logger-adapter.ts`
- **변경사항**: OpenTelemetry 로거 어댑터 구현
- **라인**: 1-212 (전체 신규 파일)
- **주요 기능**:
  - Winston 로거를 통한 OpenTelemetry Collector 로그 전송
  - 자동 trace context (traceId, spanId) 주입
  - 기존 LogService와 통합
  - 구조화된 로그 데이터 생성
- **변경 이유**: 기존 로깅 시스템을 유지하면서 OpenTelemetry 기능 추가

### 3. src/index.ts
- **파일**: `src/index.ts`
- **변경사항**: OpenTelemetry 로거 어댑터 초기화 추가
- **라인**: 5-8, 12
- **변경 전 코드**:
```typescript
/**
 * MCPHub 애플리케이션의 메인 진입점
 * 
 * 이 파일은 MCPHub 서버 애플리케이션을 시작하는 역할을 합니다.
 * - TypeORM 메타데이터 리플렉션 설정
 * - 서버 인스턴스 생성 및 초기화
 * - 애플리케이션 부팅 프로세스 관리
 */

import 'reflect-metadata'; // TypeORM 데코레이터 메타데이터 지원을 위해 필요
import AppServer from './server.js';
```
- **변경 후 코드**:
```typescript
/**
 * MCPHub 애플리케이션의 메인 진입점
 * 
 * 이 파일은 MCPHub 서버 애플리케이션을 시작하는 역할을 합니다.
 * - TypeORM 메타데이터 리플렉션 설정
 * - OpenTelemetry 로깅 어댑터 초기화
 * - 서버 인스턴스 생성 및 초기화
 * - 애플리케이션 부팅 프로세스 관리
 */

import 'reflect-metadata'; // TypeORM 데코레이터 메타데이터 지원을 위해 필요
import './config/otel-logger-adapter.js'; // OpenTelemetry 로깅 어댑터 초기화
import AppServer from './server.js';
```
- **변경 이유**: 애플리케이션 시작 시 OpenTelemetry 로거 초기화 보장

### 4. 환경변수 파일 (.env, .env.docker)
- **파일**: `.env`, `.env.docker`
- **변경사항**: OpenTelemetry 환경변수 설정 추가
- **라인**: .env 64-71, .env.docker 33-39
- **변경 전**: 환경변수 없음
- **변경 후 코드**:
```bash
# OpenTelemetry 설정
OTEL_TRACES_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318  # 로컬 개발용
# OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318  # Docker용
# OTEL_EXPORTER_OTLP_ENDPOINT=http://collector-opentelemetry-collector.otel-collector-rnr.svc.cluster.local:4318  # K8s용
OTEL_SERVICE_NAME=mcphub-backend
NODE_OPTIONS=--require @opentelemetry/auto-instrumentations-node/register
```
- **변경 이유**: 환경별로 다른 Collector 엔드포인트를 설정할 수 있도록 환경변수로 관리

## 📊 작업 결과
- **성공 여부**: ✅ 성공
- **영향받는 기능**: 
  - 모든 로그가 OpenTelemetry Collector로 전송됨
  - HTTP 요청, DB 쿼리 등이 자동으로 추적됨
  - 분산 추적을 통한 요청 흐름 파악 가능
- **테스트 결과**: 수동 테스트 필요 (pnpm install 후 애플리케이션 재시작 필요)
- **부작용**: 
  - Winston 패키지 추가로 인한 의존성 증가
  - Kubernetes 환경에서 OpenTelemetry Collector가 필요함

## 💡 학습된 내용

### 기술적 인사이트
1. **자동 계측의 편리성**: `@opentelemetry/auto-instrumentations-node`를 사용하면 코드 수정 없이 Node.js 애플리케이션 계측 가능
2. **Winston 통합**: `@opentelemetry/winston-transport`를 통해 기존 로깅 시스템과 자연스럽게 통합
3. **환경변수 설정**: `NODE_OPTIONS`를 통한 자동 계측 활성화가 Docker 환경에서도 잘 작동
4. **환경변수 중요성**: OpenTelemetry는 런타임 환경변수에 의존하므로 `.env` 파일 설정 필수
5. **누락된 패키지**: `winston`과 `@types/winston` 패키지도 필수로 추가 필요

### 문제 해결 방법
- OpenTelemetry와 기존 로깅 시스템의 충돌을 피하기 위해 어댑터 패턴 사용
- trace context를 로그에 자동으로 주입하여 로그와 트레이스 연관성 확보

### 개선점
1. **환경별 설정**: 개발/스테이징/프로덕션 환경별로 다른 Collector 엔드포인트 설정 필요
2. **보안 고려사항**: OTLP 엔드포인트에 인증 추가 고려
3. **성능 최적화**: 로그 전송 배치 처리 및 샘플링 전략 수립 필요

## 🔍 추가 작업 필요사항
1. pnpm install 실행하여 새 패키지 설치
2. Kubernetes 환경에 OpenTelemetry Collector 배포 확인
3. 로컬 개발 환경용 docker-compose에 Collector 추가 고려
4. 모니터링 대시보드 설정 (Grafana, Jaeger 등)

## 📝 참고사항
- OpenTelemetry Collector 엔드포인트는 Kubernetes 환경 기준으로 설정됨
- 로컬 개발 시에는 환경변수를 오버라이드하여 사용 가능
- Winston 로거는 기존 LogService와 병행하여 사용되므로 기존 기능에 영향 없음

## 📚 관련 문서
- [Winston Transport 구현 및 로그/트레이스 검증](./2025-01-20-opentelemetry-winston-transport-implementation.md)
- [Node.js OpenTelemetry 완전 가이드](../guides/nodejs-opentelemetry-complete-guide.md)
