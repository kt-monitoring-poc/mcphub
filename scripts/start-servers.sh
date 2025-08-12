#!/bin/bash

# MCPHub v3.0 서버 시작 스크립트
# 백엔드와 프론트엔드를 분리해서 안전하게 시작

echo "🚀 MCPHub v3.0 서버 시작 스크립트"
echo "=================================="

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 기존 프로세스 정리
echo -e "${BLUE}1. 기존 프로세스 정리 중...${NC}"
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "   포트 3000 정리 완료"
lsof -ti:5173 | xargs kill -9 2>/dev/null || echo "   포트 5173 정리 완료"
pkill -f "tsx.*src/index.ts" 2>/dev/null || echo "   tsx 프로세스 정리 완료"
pkill -f "vite.*frontend" 2>/dev/null || echo "   vite 프로세스 정리 완료"
pkill -f "concurrently" 2>/dev/null || echo "   concurrently 프로세스 정리 완료"

sleep 2

# 2. 백엔드 서버 시작
echo -e "${BLUE}2. 백엔드 서버 시작 중... (포트 3000)${NC}"
cd "$(dirname "$0")/.."
pnpm run backend:dev &
BACKEND_PID=$!

sleep 5

# 3. 백엔드 시작 확인
if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo -e "${GREEN}   ✅ 백엔드 서버 시작 성공${NC}"
else
    echo -e "${RED}   ❌ 백엔드 서버 시작 실패${NC}"
    exit 1
fi

# 4. 프론트엔드 서버 시작
echo -e "${BLUE}3. 프론트엔드 서버 시작 중... (포트 5173)${NC}"
cd frontend
pnpm run dev &
FRONTEND_PID=$!

sleep 5

# 5. 프론트엔드 시작 확인
if curl -s http://localhost:5173 >/dev/null 2>&1; then
    echo -e "${GREEN}   ✅ 프론트엔드 서버 시작 성공${NC}"
else
    echo -e "${RED}   ❌ 프론트엔드 서버 시작 실패${NC}"
    exit 1
fi

# 6. MCP 엔드포인트 확인
echo -e "${BLUE}4. MCP 엔드포인트 확인 중...${NC}"
if curl -s "http://localhost:3000/mcp" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"offerings/list"}' | grep -q "protocolVersion"; then
    echo -e "${GREEN}   ✅ MCP 엔드포인트 정상 작동${NC}"
else
    echo -e "${RED}   ❌ MCP 엔드포인트 오류${NC}"
fi

# 7. 최종 상태 출력
echo ""
echo -e "${YELLOW}🎉 MCPHub v3.0 서버 시작 완료!${NC}"
echo "=================================="
echo -e "${GREEN}백엔드 서버:${NC}    http://localhost:3000"
echo -e "${GREEN}프론트엔드 서버:${NC}  http://localhost:5173"
echo -e "${GREEN}MCP 엔드포인트:${NC}  http://localhost:3000/mcp"
echo ""
echo -e "${BLUE}프로세스 ID:${NC}"
echo "   백엔드 PID: $BACKEND_PID"
echo "   프론트엔드 PID: $FRONTEND_PID"
echo ""
echo -e "${YELLOW}서버를 중지하려면:${NC}"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo "   또는 scripts/stop-servers.sh 실행"
echo ""
echo -e "${GREEN}Cursor IDE 연결 준비 완료! 🚀${NC}"

# PID 파일에 저장 (중지 스크립트에서 사용)
echo "$BACKEND_PID" > /tmp/mcphub_backend.pid
echo "$FRONTEND_PID" > /tmp/mcphub_frontend.pid