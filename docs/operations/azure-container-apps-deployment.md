# Azure Container Apps 배포 가이드

## 📋 개요

MCPHub를 Azure Container Apps에 배포하여 확장 가능하고 관리하기 쉬운 클라우드 환경에서 운영할 수 있습니다.

## 🏗 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   PostgreSQL    │
│ Container App   │◄──►│ Container App   │◄──►│ Flexible Server │
│   (Nginx)       │    │   (Node.js)     │    │   (Azure DB)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │ Azure File Share│
                       │ (설정 파일)     │
                       └─────────────────┘
```

## 🚀 배포 단계

### 1. 사전 준비

#### Azure CLI 로그인
```bash
az login
az account set --subscription {subscription-id}
```

#### 리소스 그룹 확인
```bash
az group show --name rg-az01-co001501-sbox-poc-131
```

### 2. Azure Container Registry (ACR) 설정

#### ACR 생성
```bash
ACR_NAME="mcphubacr$(date +%s | tail -c 6)"
az acr create \
  --resource-group rg-az01-co001501-sbox-poc-131 \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true
```

#### ACR 로그인
```bash
az acr login --name $ACR_NAME
```

### 3. Azure File Share 설정

#### File Share 생성 스크립트 실행
```bash
chmod +x azure-setup-file-share.sh
./azure-setup-file-share.sh
```

#### 설정 파일 업로드
```bash
# Storage Account 정보 확인
STORAGE_ACCOUNT="mcphubstorage12345"  # 실제 생성된 이름
STORAGE_KEY="your-storage-key"
FILE_SHARE="mcphub-config"

# 설정 파일 업로드
az storage file upload \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --share-name $FILE_SHARE \
  --source ./mcp_settings.json \
  --path mcp_settings.json

az storage file upload \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --share-name $FILE_SHARE \
  --source ./servers.json \
  --path servers.json
```

### 4. Docker 이미지 빌드 및 푸시

#### Backend 이미지
```bash
# Backend 빌드
docker build \
  --platform linux/amd64 \
  --build-arg INSTALL_PLAYWRIGHT=false \
  -t $ACR_NAME.azurecr.io/mcphub-backend:latest \
  -f Dockerfile .

# Backend 푸시
docker push $ACR_NAME.azurecr.io/mcphub-backend:latest
```

#### Frontend 이미지
```bash
# Frontend 빌드
docker build \
  --platform linux/amd64 \
  -t $ACR_NAME.azurecr.io/mcphub-frontend:latest \
  -f frontend/Dockerfile ./frontend

# Frontend 푸시
docker push $ACR_NAME.azurecr.io/mcphub-frontend:latest
```

### 5. Azure Container Apps 환경 설정

#### Container Apps 환경 생성
```bash
az containerapp env create \
  --name mcphub-env \
  --resource-group rg-az01-co001501-sbox-poc-131 \
  --location koreacentral
```

### 6. Container Apps 배포

#### 설정 파일 업데이트
`azure-container-apps.yaml`에서 다음 값들을 실제 값으로 변경:

```yaml
# ACR 정보
{acr-name}: mcphubacr12345

# Storage Account 정보
{storage-account-name}: mcphubstorage12345
{storage-account-key}: your-storage-key

# GitHub OAuth 정보
{github-client-id}: your-github-client-id
{github-client-secret}: your-github-client-secret

# JWT Secret
{jwt-secret}: your-jwt-secret

# Subscription 및 Resource Group
{subscription-id}: your-subscription-id
{resource-group}: rg-az01-co001501-sbox-poc-131
{environment-name}: mcphub-env
```

#### Backend 배포
```bash
az containerapp create \
  --name mcphub-backend \
  --resource-group rg-az01-co001501-sbox-poc-131 \
  --environment mcphub-env \
  --image $ACR_NAME.azurecr.io/mcphub-backend:latest \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 10 \
  --cpu 1.0 \
  --memory 2Gi \
  --env-vars NODE_ENV=production REQUEST_TIMEOUT=60000 \
  --secrets database-url="postgresql://ktadmin:New1234!@postgres-az01-sbox-poc-131.postgres.database.azure.com:5432/mcphub?sslmode=require" \
  --volume-storage-name mcphub-config \
  --volume-storage-account-name $STORAGE_ACCOUNT \
  --volume-storage-account-key $STORAGE_KEY \
  --volume-storage-share-name mcphub-config \
  --volume-storage-mount-path /app/config
```

#### Frontend 배포
```bash
az containerapp create \
  --name mcphub-frontend \
  --resource-group rg-az01-co001501-sbox-poc-131 \
  --environment mcphub-env \
  --image $ACR_NAME.azurecr.io/mcphub-frontend:latest \
  --target-port 80 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 5 \
  --cpu 0.5 \
  --memory 1Gi \
  --env-vars VITE_API_BASE_URL="https://mcphub-backend.mcphub-env.koreacentral.azurecontainerapps.io"
```

## 🔧 설정 파일 관리

### 설정 파일 업데이트

#### 1. 로컬에서 파일 수정
```bash
# mcp_settings.json 수정
vim mcp_settings.json

# servers.json 수정
vim servers.json
```

#### 2. Azure File Share에 업로드
```bash
# mcp_settings.json 업로드
az storage file upload \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --share-name mcphub-config \
  --source ./mcp_settings.json \
  --path mcp_settings.json

# servers.json 업로드
az storage file upload \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --share-name mcphub-config \
  --source ./servers.json \
  --path servers.json
```

#### 3. Container App 재시작
```bash
# Backend 재시작
az containerapp restart \
  --name mcphub-backend \
  --resource-group rg-az01-co001501-sbox-poc-131
```

### 설정 파일 확인

#### Azure File Share 내용 확인
```bash
# 파일 목록 확인
az storage file list \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --share-name mcphub-config

# 파일 내용 확인
az storage file download \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --share-name mcphub-config \
  --path mcp_settings.json \
  --dest ./mcp_settings_azure.json
```

## 📊 모니터링

### 로그 확인
```bash
# Backend 로그
az containerapp logs show \
  --name mcphub-backend \
  --resource-group rg-az01-co001501-sbox-poc-131 \
  --follow

# Frontend 로그
az containerapp logs show \
  --name mcphub-frontend \
  --resource-group rg-az01-co001501-sbox-poc-131 \
  --follow
```

### 상태 확인
```bash
# Container App 상태
az containerapp show \
  --name mcphub-backend \
  --resource-group rg-az01-co001501-sbox-poc-131 \
  --query properties.runningStatus

# 스케일링 상태
az containerapp replica list \
  --name mcphub-backend \
  --resource-group rg-az01-co001501-sbox-poc-131
```

## 🔒 보안 고려사항

### 1. 시크릿 관리
- 데이터베이스 연결 문자열
- GitHub OAuth 정보
- JWT 시크릿
- Storage Account 키

### 2. 네트워크 보안
- Azure Container Apps는 기본적으로 HTTPS 사용
- 내부 통신은 Azure 네트워크 내에서 처리

### 3. 접근 제어
- Azure RBAC를 통한 리소스 접근 제어
- Container Apps 환경별 격리

## 🚨 문제 해결

### 일반적인 문제들

#### 1. 이미지 빌드 실패
```bash
# 플랫폼 명시
docker build --platform linux/amd64 ...

# 캐시 클리어
docker build --no-cache ...
```

#### 2. 설정 파일 로딩 실패
```bash
# File Share 마운트 확인
az containerapp show \
  --name mcphub-backend \
  --resource-group rg-az01-co001501-sbox-poc-131 \
  --query properties.template.volumes

# 로그에서 설정 파일 경로 확인
az containerapp logs show \
  --name mcphub-backend \
  --resource-group rg-az01-co001501-sbox-poc-131
```

#### 3. 데이터베이스 연결 실패
```bash
# 네트워크 연결 확인
az containerapp exec \
  --name mcphub-backend \
  --resource-group rg-az01-co001501-sbox-poc-131 \
  --command "curl -v postgres-az01-sbox-poc-131.postgres.database.azure.com:5432"
```

## 📈 확장성

### 자동 스케일링
- HTTP 트래픽 기반 자동 스케일링
- 최소 1개, 최대 10개 인스턴스
- 동시 요청 수 기반 스케일링

### 수동 스케일링
```bash
# Backend 스케일 조정
az containerapp revision set-mode \
  --name mcphub-backend \
  --resource-group rg-az01-co001501-sbox-poc-131 \
  --mode Single

# 특정 레플리카 수 설정
az containerapp update \
  --name mcphub-backend \
  --resource-group rg-az01-co001501-sbox-poc-131 \
  --min-replicas 2 \
  --max-replicas 5
```

## 💰 비용 최적화

### 비용 절약 팁
1. **개발 환경**: 최소 레플리카 0으로 설정
2. **프로덕션 환경**: 최소 레플리카 1로 설정
3. **리소스 크기**: 실제 사용량에 맞게 조정
4. **Storage**: Standard_LRS 사용 (비용 효율적)

### 비용 모니터링
```bash
# 리소스 사용량 확인
az monitor metrics list \
  --resource /subscriptions/{subscription-id}/resourceGroups/rg-az01-co001501-sbox-poc-131/providers/Microsoft.App/containerApps/mcphub-backend \
  --metric CpuPercentage,MemoryPercentage
```

---

**최종 업데이트**: 2025-08-04  
**문서 버전**: 1.0.0  
**작성자**: MCPHub 개발팀 