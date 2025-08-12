#!/bin/bash

# MCPHub 서비스별 디버그 로깅 테스트 스크립트
# @sseService.ts와 @mcpService.ts의 상세한 디버그 로그를 확인합니다.

echo "🔍 MCPHub Service Debug Test"
echo "=============================="
echo ""

# 색상 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 테스트 단계 함수
test_step() {
    echo -e "${BLUE}▶ $1${NC}"
    echo "───────────────────────────────────────"
}

# 서버 시작 상태 확인
test_step "0. Server Status Check"
if ! curl -s http://localhost:3000/api/health > /dev/null; then
    echo -e "${RED}❌ 서버가 실행되지 않고 있습니다.${NC}"
    echo "DEBUG_MCPHUB=true pnpm start:dev 로 서버를 시작하세요."
    exit 1
fi
echo -e "${GREEN}✅ 서버가 실행 중입니다.${NC}"
echo ""

# 1. Health Check
test_step "1. Health Check"
curl -s http://localhost:3000/api/health | jq .
echo ""

# 2. 로그인 (JWT 토큰 획득)
test_step "2. Login to get JWT Token"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "New1234!"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ 로그인 실패${NC}"
    echo "$LOGIN_RESPONSE" | jq .
    exit 1
fi

echo -e "${GREEN}✅ 토큰 획득 성공${NC}"
echo "Token: ${TOKEN:0:20}..."
echo ""

# 3. MCPHub Key로 Tools 목록 조회 (서비스 로그 확인)
test_step "3. Tools List with Service Debug Logs"
echo "📝 이 단계에서 @mcpService.ts의 디버그 로그를 확인하세요:"
echo "  - handleListToolsRequest 함수"
echo "  - 사용자 인증 과정"
echo "  - MCP 서버 연결 상태"
echo ""

curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }' | jq . | head -20
echo ""

# 4. Tool Call로 실제 MCP 서버 통신 (네트워크 로그 확인)
test_step "4. Tool Call with Network Debug Logs"
echo "📝 이 단계에서 @sseService.ts와 @mcpService.ts의 디버그 로그를 확인하세요:"
echo "  - handleMcpPostRequest 함수"
echo "  - handleCallToolRequest 함수"  
echo "  - createTransportFromConfig 함수"
echo "  - 실제 MCP 서버와의 네트워크 통신"
echo "  - 헤더값 전송/수신"
echo ""

curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "test",
      "arguments": {}
    },
    "id": 2
  }' | jq . | head -10
echo ""

# 5. GET 요청으로 SSE 연결 테스트
test_step "5. GET Request Debug Logs"
echo "📝 이 단계에서 @sseService.ts의 디버그 로그를 확인하세요:"
echo "  - handleMcpOtherRequest 함수"
echo "  - Bearer 인증 과정"
echo "  - 헤더 처리"
echo ""

curl -s -X GET "http://localhost:3000/mcp?sessionId=test-session" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json,text/event-stream" | head -5
echo ""

echo -e "${GREEN}🎉 Service Debug Test Complete!${NC}"
echo ""
echo "📊 Debug Log Analysis:"
echo "1. 서버 로그에서 다음 패턴들을 확인하세요:"
echo "   - @sseService.ts - MCP Other Request"
echo "   - @sseService.ts - 인증 성공/실패 로그"
echo "   - @mcpService.ts - Tool Call Request"
echo "   - @mcpService.ts - Upstream headers"
echo "   - @mcpService.ts - StreamableHTTP Transport created"
echo "   - @mcpService.ts - Tool Response"
echo ""
echo "2. 네트워크 통신 로그에서 확인할 사항:"
echo "   - HTTP 헤더값 (Authorization, Content-Type 등)"
echo "   - MCP 서버별 연결 상태"
echo "   - 요청/응답 데이터 구조"
echo "   - 응답 시간 측정"
echo ""
echo "3. 색상별 로그 구분:"
echo "   - 🚀 요청 시작"
echo "   - 🔐 인증 관련"
echo "   - 🌐 네트워크 요청/응답"
echo "   - 🔌 MCP 서버 연결"
echo "   - 🔧 Tool 호출"
echo "   - ✅ 성공 완료"
