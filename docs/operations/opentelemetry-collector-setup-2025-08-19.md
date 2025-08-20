# OpenTelemetry Collector 설정 및 연결 가이드

## 📅 작업 일시
- **작성일**: 2025-08-19
- **최종 수정**: 2025-08-19 10:40 KST

## 🎯 개요
MCPHub에서 OpenTelemetry Collector로 로그와 트레이스를 전송하기 위한 설정 가이드입니다.

## 🔧 Kubernetes 환경 구성

### OpenTelemetry Collector 구성 (3-tier)
1. **Main Collector** (`collector-opentelemetry-collector`)
   - 모든 로그와 트레이스를 수집하는 첫 번째 수집기
   - 다른 두 Collector로 필터링된 데이터 전달

2. **Span Metrics Collector** (`spanmetrics-opentelemetry-collector`)
   - 특정 메트릭 처리

3. **Tail Sampling Collector** (`tailsamplling-opentelemetry-collector`)
   - 샘플링 처리

### Ingress 설정
```yaml
# namespace: otel-collector-rnr
# ingress name: collector-ingress

Rules:
- HTTP: collector-http.rnr-apps-01.4.217.129.211.nip.io → 포트 4318
- gRPC: collector-grpc.rnr-apps-01.4.217.129.211.nip.io → 포트 4317
```

## 🔌 연결 설정

### 1. 로컬 개발 환경 설정

#### /etc/hosts 파일 수정
```bash
# 다음 라인 추가
4.217.129.211 collector-http.rnr-apps-01.4.217.129.211.nip.io collector-grpc.rnr-apps-01.4.217.129.211.nip.io
```

#### .env 파일 설정
```env
# OpenTelemetry 설정 (개발 환경)
OTEL_TRACES_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=http://collector-http.rnr-apps-01.4.217.129.211.nip.io
OTEL_SERVICE_NAME=mcphub-backend
NODE_OPTIONS=--require @opentelemetry/auto-instrumentations-node/register
```

### 2. Docker 환경 설정 (.env.docker)
```env
OTEL_TRACES_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_SERVICE_NAME=mcphub-backend
NODE_OPTIONS=--require @opentelemetry/auto-instrumentations-node/register
```

### 3. Kubernetes 환경 설정
```env
# 클러스터 내부에서는 Service 직접 호출
OTEL_EXPORTER_OTLP_ENDPOINT=http://collector-opentelemetry-collector.otel-collector-rnr.svc.cluster.local:4318
```

## 🧪 연결 테스트

### 1. Ingress 접근성 테스트
```bash
# DNS 해결 확인
nslookup collector-http.rnr-apps-01.4.217.129.211.nip.io

# HTTP 엔드포인트 테스트
curl -v http://collector-http.rnr-apps-01.4.217.129.211.nip.io/v1/logs \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"resourceLogs":[{"resource":{"attributes":[{"key":"service.name","value":{"stringValue":"test"}}]},"scopeLogs":[{"logRecords":[{"timeUnixNano":"1640000000000000000","body":{"stringValue":"test log"}}]}]}]}'
```

### 2. 애플리케이션 로그 테스트
```bash
# 환경변수 설정 후 테스트
OTEL_EXPORTER_OTLP_ENDPOINT=http://collector-http.rnr-apps-01.4.217.129.211.nip.io \
OTEL_SERVICE_NAME=mcphub-backend \
OTEL_TRACES_EXPORTER=otlp \
OTEL_LOGS_EXPORTER=otlp \
node test-otel-logging.js
```

### 3. Collector 로그 확인
```bash
# Main Collector 로그 확인
kubectl logs -n otel-collector-rnr deployment/collector-opentelemetry-collector --tail=50

# Loki로 전송되는 로그 확인
kubectl logs -n otel-collector-rnr deployment/spanmetrics-opentelemetry-collector --tail=50

# Tempo로 전송되는 트레이스 확인
kubectl logs -n otel-collector-rnr deployment/tailsamplling-opentelemetry-collector --tail=50
```

## 🔍 문제 해결

### DNS 해결 실패
- `/etc/hosts` 파일에 엔트리 추가 확인
- 또는 직접 IP 사용: `http://4.217.129.211` (Host 헤더 필요)

### 연결 타임아웃
- Kubernetes Ingress Controller 상태 확인
- 네트워크 정책 확인
- 방화벽 규칙 확인

### 로그가 전송되지 않음
1. 환경변수 확인: `echo $OTEL_EXPORTER_OTLP_ENDPOINT`
2. OpenTelemetry 패키지 설치 확인: `npm list | grep opentelemetry`
3. Winston Logger Adapter 초기화 확인

## 📊 모니터링

### Grafana 대시보드
- URL: http://grafana.4.217.129.211.nip.io
- Loki 데이터소스에서 로그 확인
- Tempo 데이터소스에서 트레이스 확인

### 로그 쿼리 예시
```
{service_name="mcphub-backend"}
```

## 📝 참고사항
- OpenTelemetry Collector는 OTLP(OpenTelemetry Protocol) 형식으로 데이터를 수신
- HTTP/protobuf와 gRPC 두 가지 프로토콜 지원
- 로컬 개발 시 HTTP 프로토콜 사용 권장 (포트 4318)
- 프로덕션에서는 gRPC 사용 고려 (포트 4317)
