# Azure 백엔드 이미지 업데이트 명령어

## 1. 새로운 백엔드 이미지로 업데이트
```bash
az containerapp update \
  --name mcphub-backend \
  --resource-group rg-az01-co001501-sbox-poc-131 \
  --image giglepeople/mcphub-backend:v1-20250806-161549
```

## 2. 업데이트 확인
```bash
az containerapp show \
  --name mcphub-backend \
  --resource-group rg-az01-co001501-sbox-poc-131 \
  --query "properties.template.containers[0].image"
```

## 3. 컨테이너 재시작 (필요시)
```bash
az containerapp restart \
  --name mcphub-backend \
  --resource-group rg-az01-co001501-sbox-poc-131
```

## 4. 로그 확인
```bash
az containerapp logs show \
  --name mcphub-backend \
  --resource-group rg-az01-co001501-sbox-poc-131 \
  --follow
```

## 5. 업데이트 후 테스트 URL
- GET: https://mcphub-backend.redrock-1ca7a56f.koreacentral.azurecontainerapps.io/api/user-env-vars
- 프론트엔드에서 환경변수 저장 테스트