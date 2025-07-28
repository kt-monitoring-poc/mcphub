# MCPHub AKS 배포 가이드

## 개요
MCPHub를 AKS(Azure Kubernetes Service)에 배포하여 OpenTelemetry를 통한 관찰성을 확보합니다.

## 파일 구조
```
k8s/
├── configmap.yaml          # 환경변수 설정
├── deployment.yaml         # 애플리케이션 배포
├── service.yaml           # 내부 서비스
├── ingress.yaml           # 외부 접근
├── all-in-one.yaml        # 모든 리소스 통합
└── README.md              # 이 파일
```

## 배포 방법

### Azure Portal을 통한 배포 (권장)

1. **Azure Portal에서 AKS 클러스터 접속**
   - AKS 클러스터 → Workloads → Deployments
   - "YAML" 탭 선택

2. **all-in-one.yaml 업로드**
   - `k8s/all-in-one.yaml` 파일 내용을 복사하여 붙여넣기
   - "Create" 클릭

3. **배포 확인**
   - Pods, Services, Ingress 상태 확인

### 개별 파일 배포

```bash
# 1. ConfigMap 생성
kubectl apply -f k8s/configmap.yaml

# 2. Deployment 생성
kubectl apply -f k8s/deployment.yaml

# 3. Service 생성
kubectl apply -f k8s/service.yaml

# 4. Ingress 생성
kubectl apply -f k8s/ingress.yaml
```

## 주요 설정

### OpenTelemetry 설정
- **Traces Exporter**: OTLP
- **Logs Exporter**: OTLP
- **Endpoint**: AKS 내부 Collector 서비스
- **Service Name**: mcphub-backend

### 리소스 요구사항
- **Memory**: 512Mi (요청) / 1Gi (제한)
- **CPU**: 250m (요청) / 500m (제한)

## Grafana에서 확인

### Traces (Tempo)
```logql
service.name="mcphub-backend"
```

### Logs (Loki)
```logql
{service_name="mcphub-backend"}
```

### Metrics (Mimir)
```promql
http_requests_total{service_name="mcphub-backend"}
```

## 문제 해결

### Pod 상태 확인
```bash
kubectl get pods -n mcphub
kubectl describe pod <pod-name> -n mcphub
```

### 로그 확인
```bash
kubectl logs <pod-name> -n mcphub -f
```

### 서비스 확인
```bash
kubectl get svc -n mcphub
kubectl get ingress -n mcphub
``` 