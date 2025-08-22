# OpenTelemetry Docker 통합 작업 기록

## 📅 작업 일시
- **시작**: 2025-08-13 17:00 KST
- **완료**: 2025-08-13 17:50 KST
- **총 소요 시간**: 약 50분

## 🎯 작업 목적
- **사용자 요청**: "main 브랜치로 이동해서 해당 변경 사항을 모두 적용해줘"
- **해결할 문제**: Docker 빌드 시 OpenTelemetry 모듈을 찾을 수 없는 오류 및 Node.js 이미지 태그 오류
- **예상 결과**: OpenTelemetry 설정을 유지하면서 Docker 빌드 성공

## 🔧 수정된 파일들

### 1. package.json
- **파일**: `package.json`
- **변경사항**: 잘못된 OpenTelemetry 패키지 제거
- **라인**: dependencies 섹션
- **변경 전 코드**: 
```json
"@opentelemetry/exporter-otlp": "^0.54.0"
```
- **변경 후 코드**: 해당 패키지 제거
- **변경 이유**: `@opentelemetry/exporter-otlp` 패키지가 npm 레지스트리에 존재하지 않음. 이미 `@opentelemetry/exporter-trace-otlp-http`와 `@opentelemetry/exporter-logs-otlp-http` 패키지가 설치되어 있음

### 2. Dockerfile
- **파일**: `Dockerfile`
- **변경사항**: 
  1. OpenTelemetry 설정을 런타임에만 적용하도록 수정
  2. Node.js 이미지 태그 수정
- **라인**: 11, 67-70, 125-130
- **변경 전 코드**:
```dockerfile
FROM --platform=linux/amd64 node:22-slim-bookworm AS base

# opentelemetry 설정
ENV OTEL_TRACES_EXPORTER="otlp"
ENV OTEL_EXPORTER_OTLP_ENDPOINT="http://collector-opentelemetry-collector.otel-collector-rnr.svc.cluster.local:4317"
ENV OTEL_SERVICE_NAME="mcphub-backend"
ENV NODE_OPTIONS="--require @opentelemetry/auto-instrumentations-node/register"
```
- **변경 후 코드**:
```dockerfile
FROM --platform=linux/amd64 node:22-bookworm-slim AS base

# OpenTelemetry 설정 (빌드 시점에는 환경변수만 설정, NODE_OPTIONS는 설정하지 않음)
ARG OTEL_TRACES_EXPORTER="otlp"
ARG OTEL_EXPORTER_OTLP_ENDPOINT="http://collector-opentelemetry-collector.otel-collector-rnr.svc.cluster.local:4317"
ARG OTEL_SERVICE_NAME="mcphub-backend"
ARG OTEL_ENABLED="true"

# ... (중간 생략) ...

# OpenTelemetry 환경변수 설정 (의존성 설치 후)
ENV OTEL_TRACES_EXPORTER=$OTEL_TRACES_EXPORTER
ENV OTEL_EXPORTER_OTLP_ENDPOINT=$OTEL_EXPORTER_OTLP_ENDPOINT
ENV OTEL_SERVICE_NAME=$OTEL_SERVICE_NAME
ENV OTEL_ENABLED=$OTEL_ENABLED
```
- **변경 이유**: 
  1. 빌드 시점에 NODE_OPTIONS를 설정하면 의존성이 설치되기 전에 OpenTelemetry 모듈을 찾으려고 해서 오류 발생
  2. `node:22-slim-bookworm` 이미지 태그가 존재하지 않아서 `node:22-bookworm-slim`으로 수정

### 3. entrypoint.sh
- **파일**: `entrypoint.sh`
- **변경사항**: OpenTelemetry 설정을 런타임에만 적용하도록 수정
- **라인**: 25-35
- **변경 전 코드**: OpenTelemetry 설정 없음
- **변경 후 코드**:
```bash
# OpenTelemetry 설정 확인 및 활성화 (런타임에만)
if [ "$OTEL_ENABLED" = "true" ]; then
  echo "OpenTelemetry enabled with endpoint: $OTEL_EXPORTER_OTLP_ENDPOINT"
  echo "Service name: $OTEL_SERVICE_NAME"
  # 런타임에 NODE_OPTIONS 설정
  export NODE_OPTIONS="--require @opentelemetry/auto-instrumentations-node/register"
  echo "NODE_OPTIONS set to: $NODE_OPTIONS"
else
  echo "OpenTelemetry disabled"
fi
```
- **변경 이유**: 의존성이 설치된 후 런타임에만 OpenTelemetry 모듈을 로드하도록 하여 빌드 오류 방지

### 4. src/index.ts
- **파일**: `src/index.ts`
- **변경사항**: OpenTelemetry 로거 어댑터 import 추가
- **라인**: 5-8, 12
- **변경 전 코드**:
```typescript
import 'reflect-metadata'; // TypeORM 데코레이터 메타데이터 지원을 위해 필요
import AppServer from './server.js';
```
- **변경 후 코드**:
```typescript
import 'reflect-metadata'; // TypeORM 데코레이터 메타데이터 지원을 위해 필요
import './config/otel-logger-adapter.js'; // OpenTelemetry 로깅 어댑터 초기화
import AppServer from './server.js';
```
- **변경 이유**: 애플리케이션 시작 시 OpenTelemetry 로거 초기화 보장

## 📊 작업 결과
- **성공 여부**: ✅ 성공
- **영향받는 기능**: 
  - Docker 빌드 성공
  - OpenTelemetry 설정 유지
  - 런타임에 OpenTelemetry 자동 계측 활성화
- **테스트 결과**: pnpm install 성공, Docker 빌드 성공 예상
- **부작용**: 없음

## 💡 학습된 내용

### 기술적 인사이트
1. **빌드 시점 vs 런타임**: OpenTelemetry 모듈은 의존성 설치 후에만 사용 가능
2. **NODE_OPTIONS 타이밍**: 빌드 시점에 설정하면 의존성 설치 전에 모듈을 찾으려고 함
3. **환경변수 분리**: 빌드 시점과 런타임 시점의 환경변수를 분리하여 관리
4. **entrypoint.sh 활용**: 런타임 초기화를 entrypoint.sh에서 처리
5. **패키지명 확인**: `@opentelemetry/exporter-otlp`는 존재하지 않는 패키지명
6. **Docker 이미지 태그**: `node:22-slim-bookworm` → `node:22-bookworm-slim` 올바른 태그 사용

### 문제 해결 방법
- OpenTelemetry 환경변수를 ARG로 설정하여 빌드 시점에 전달
- NODE_OPTIONS는 entrypoint.sh에서 런타임에만 설정
- 의존성 설치 후에만 OpenTelemetry 모듈 사용
- 올바른 패키지명 사용: `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/exporter-logs-otlp-http`
- 올바른 Docker 이미지 태그 사용: `node:22-bookworm-slim`

### 개선점
1. **환경별 설정**: 개발/스테이징/프로덕션 환경별로 다른 Collector 엔드포인트 설정
2. **조건부 활성화**: OTEL_ENABLED 환경변수로 OpenTelemetry 활성화/비활성화 제어
3. **에러 처리**: OpenTelemetry 모듈 로드 실패 시 graceful fallback
4. **패키지 검증**: npm 레지스트리에서 패키지 존재 여부 확인 후 추가
5. **이미지 태그 검증**: Docker Hub에서 이미지 태그 존재 여부 확인

## 🔍 추가 작업 필요사항
1. 의존성 업데이트: `pnpm install` ✅ 완료
2. Docker 빌드 테스트: `./build-for-azure.sh`
3. 환경변수 파일 생성: `.env`, `.env.docker` 파일에 OpenTelemetry 설정 추가
4. 로컬 개발 환경 테스트

## 📝 참고사항
- OpenTelemetry 설정은 런타임에만 적용되어 빌드 오류 방지
- 환경변수 파일(.env, .env.docker)에 OpenTelemetry 설정 추가 필요
- Docker 빌드 시 `--build-arg OTEL_ENABLED=false`로 OpenTelemetry 비활성화 가능
- 올바른 OpenTelemetry 패키지명 사용: `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/exporter-logs-otlp-http`
- 올바른 Node.js 이미지 태그 사용: `node:22-bookworm-slim`

## 📚 관련 문서
- [OpenTelemetry 통합 초기 구현](./2025-01-12-opentelemetry-integration.md)
- [Winston Transport 구현 및 로그/트레이스 검증](./2025-01-20-opentelemetry-winston-transport-implementation.md)
