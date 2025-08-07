#!/bin/bash

# MCPHub 디버그 플로우 테스트 스크립트
# End-to-End 요청 플로우를 추적하기 위한 테스트

echo "🔍 MCPHub Debug Flow Test"
echo "========================="
echo ""

# 디버그 모드 활성화
export DEBUG_MCPHUB=true
export NODE_ENV=development

# 색상 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 테스트 단계 표시 함수
test_step() {
    echo -e "\n${BLUE}▶ $1${NC}"
    echo "───────────────────────────────────────"
}

# 1. 서버 상태 확인
test_step "1. Health Check"
curl -s http://localhost:3000/api/health | jq .

# 2. 로그인 (JWT 토큰 획득)
test_step "2. Login to get JWT Token"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "New1234!"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ 로그인 실패${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 토큰 획득 성공${NC}"
echo "Token: ${TOKEN:0:20}..."

# 3. MCP 서버 목록 조회
test_step "3. Get MCP Server List"
curl -s -H "x-auth-token: $TOKEN" \
  http://localhost:3000/api/servers | jq '.servers[] | {name, type, status}'

# 4. 툴 목록 조회
test_step "4. Get Tool List"
curl -s -H "x-auth-token: $TOKEN" \
  http://localhost:3000/api/tools | jq '.[] | {name, server: .server.name}'

# 5. MCP offerings/list 직접 호출
test_step "5. Direct MCP offerings/list"
curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "method": "offerings/list",
    "id": 1
  }' | jq .

# 6. 툴 호출 테스트 (예: test 서버의 echo 툴)
test_step "6. Tool Call Test"
curl -s -X POST http://localhost:3000/api/tools/call \
  -H "Content-Type: application/json" \
  -H "x-auth-token: $TOKEN" \
  -d '{
    "toolName": "echo",
    "arguments": {
      "message": "Hello from debug test!"
    }
  }' | jq .

# 7. 환경변수 템플릿 조회
test_step "7. Get Environment Variable Templates"
curl -s -H "x-auth-token: $TOKEN" \
  http://localhost:3000/api/env-templates | jq .

# 8. 스케줄러 상태 확인
test_step "8. Check Scheduler Status"
curl -s -H "x-auth-token: $TOKEN" \
  http://localhost:3000/api/admin/env-scheduler/status | jq .

echo -e "\n${GREEN}🎉 Debug Flow Test Complete!${NC}"
echo "Check the server logs for detailed debug output."
