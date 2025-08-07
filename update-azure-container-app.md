# Azure Container Apps - Docker Hub 이미지 업데이트 가이드

## 🎯 현재 상황
- 프론트엔드 이미지: `giglepeople/mcphub-frontend:v1` (Docker Hub)
- 새로운 타임스탬프 태그: `giglepeople/mcphub-frontend:v1-20250806-152804`
- Azure Container Apps에서 배포 업데이트가 필요

## 📋 업데이트 방법

### 방법 1: Azure CLI로 Container App 이미지 업데이트

```bash
# 1. Azure 로그인
az login

# 2. 구독 설정 (실제 구독 ID 사용)
az account set --subscription {subscription-id}

# 3. Container App 이미지 업데이트
az containerapp update \
  --name mcphub-frontend \
  --resource-group rg-az01-co001501-sbox-poc-131 \
  --image giglepeople/mcphub-frontend:v1-20250806-152804

# 4. 업데이트 확인
az containerapp show \
  --name mcphub-frontend \
  --resource-group rg-az01-co001501-sbox-poc-131 \
  --query "properties.template.containers[0].image"
```

### 방법 2: Azure Portal에서 수동 업데이트

1. **Azure Portal** → **Container Apps** → **mcphub-frontend**
2. **Containers** 탭 클릭
3. **Edit and deploy** 클릭
4. **Container image** 필드를 다음으로 변경:
   ```
   giglepeople/mcphub-frontend:v1-20250806-152804
   ```
5. **Deploy** 클릭

### 방법 3: 강제 재시작 (이미지 변경 없이)

```bash
# Container App 재시작으로 최신 이미지 강제 Pull
az containerapp restart \
  --name mcphub-frontend \
  --resource-group rg-az01-co001501-sbox-poc-131
```

## 🔍 배포 상태 확인

### 로그 확인
```bash
# 실시간 로그 확인
az containerapp logs show \
  --name mcphub-frontend \
  --resource-group rg-az01-co001501-sbox-poc-131 \
  --follow

# 최근 로그 확인
az containerapp logs show \
  --name mcphub-frontend \
  --resource-group rg-az01-co001501-sbox-poc-131 \
  --tail 50
```

### Revision 상태 확인
```bash
# 활성 Revision 확인
az containerapp revision list \
  --name mcphub-frontend \
  --resource-group rg-az01-co001501-sbox-poc-131 \
  --query "[?properties.active==\`true\`].{Name:name,Active:properties.active,Timestamp:properties.createdTime}"
```

### 헬스 체크
```bash
# URL 접근 테스트
curl -I https://mcphub-frontend.redrock-1ca7a56f.koreacentral.azurecontainerapps.io/

# OAuth 엔드포인트 테스트
curl -I https://mcphub-frontend.redrock-1ca7a56f.koreacentral.azurecontainerapps.io/api/auth/github
```

## 🚨 문제 해결

### 이미지 Pull 실패
```bash
# Container App이 Docker Hub에서 이미지를 가져올 수 있는지 확인
az containerapp exec \
  --name mcphub-frontend \
  --resource-group rg-az01-co001501-sbox-poc-131 \
  --command "docker pull giglepeople/mcphub-frontend:v1-20250806-152804"
```

### Nginx 설정 확인
```bash
# 컨테이너 내부 nginx 설정 확인
az containerapp exec \
  --name mcphub-frontend \
  --resource-group rg-az01-co001501-sbox-poc-131 \
  --command "cat /etc/nginx/conf.d/default.conf"
```

## ✅ 성공 확인

업데이트가 성공했다면:
1. **GitHub OAuth**: `https://mcphub-frontend.../api/auth/github` → 백엔드로 정상 프록시
2. **HTTPS 프록시**: nginx가 `https://mcphub-backend...`로 올바르게 프록시
3. **설정 페이지**: API 키/토큰이 정상적으로 로드 및 저장

---

**권장사항**: **방법 1 (Azure CLI)**을 먼저 시도하고, 실패하면 **방법 2 (Portal)**를 사용하세요.