#!/bin/bash

# MCPHub 디버그 플로우 데모 스크립트
# 실제 디버그 로그 출력을 보여주기 위한 스크립트

echo "🔍 MCPHub Debug Flow Demo"
echo "========================="
echo ""

# 색상 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# 시뮬레이션된 디버그 로그 출력
simulate_log() {
    local req_id="req_$(date +%s)000_$(head /dev/urandom | tr -dc a-z0-9 | head -c 9)"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}🚀 [$req_id] NEW REQUEST STARTED${NC}"
    echo -e "${CYAN}📍 $1${NC}"
    echo -e "${CYAN}🕐 $timestamp${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# 1. Health Check 요청
simulate_log "GET /api/health"
sleep 0.5

# 2. 로그인 요청 with 인증 로그
req_id="req_$(date +%s)000_$(head /dev/urandom | tr -dc a-z0-9 | head -c 9)"
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🚀 [$req_id] NEW REQUEST STARTED${NC}"
echo -e "${CYAN}📍 POST /api/auth/login${NC}"
echo -e "${CYAN}🕐 $timestamp${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

sleep 0.2

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔐 [$req_id] AUTHENTICATION${NC}"
echo -e "${YELLOW}   Type: Password${NC}"
echo -e "${YELLOW}   Success: ✅${NC}"
echo -e "${YELLOW}   User: admin${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

sleep 0.2

echo -e "${GREEN}🗄️  [$req_id] DATABASE SELECT${NC}"
echo -e "${GREEN}   Table: users${NC}"
echo -e "${GREEN}   Data: { username: 'admin', isAdmin: true }${NC}"
echo ""

sleep 0.3

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}✅ [$req_id] REQUEST COMPLETED${NC}"
echo -e "${CYAN}   Status: 200${NC}"
echo -e "${CYAN}   Duration: 85ms${NC}"
echo -e "${CYAN}   Response: {${NC}"
echo -e "${CYAN}     \"success\": true,${NC}"
echo -e "${CYAN}     \"message\": \"Login successful\",${NC}"
echo -e "${CYAN}     \"token\": \"eyJhbGciOiJIUzI1NiIs...\"${NC}"
echo -e "${CYAN}   }...${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# 3. MCP 툴 호출 with 전체 플로우
sleep 1
req_id="req_$(date +%s)000_$(head /dev/urandom | tr -dc a-z0-9 | head -c 9)"
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🚀 [$req_id] NEW REQUEST STARTED${NC}"
echo -e "${CYAN}📍 POST /api/tools/call${NC}"
echo -e "${CYAN}🕐 $timestamp${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

sleep 0.2

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔐 [$req_id] AUTHENTICATION${NC}"
echo -e "${YELLOW}   Type: JWT${NC}"
echo -e "${YELLOW}   Success: ✅${NC}"
echo -e "${YELLOW}   User: admin${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

sleep 0.2

echo -e "${GREEN}🗄️  [$req_id] DATABASE SELECT${NC}"
echo -e "${GREEN}   Table: user_tokens${NC}"
echo -e "${GREEN}   Data: { userId: 1, serviceName: 'github-pr-mcp-server' }${NC}"
echo ""

sleep 0.2

echo -e "${GREEN}🔑 [$req_id] TOKEN APPLICATION${NC}"
echo -e "${GREEN}   Server: github-pr-mcp-server${NC}"
echo -e "${GREEN}   Tokens Applied: 1${NC}"
echo -e "${GREEN}   - GITHUB_TOKEN: ghp_abcdef1234567890...${NC}"
echo ""

sleep 0.3

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🌐 [$req_id] NETWORK REQUEST${NC}"
echo -e "${CYAN}   Method: POST${NC}"
echo -e "${CYAN}   URL: https://api.github.com/graphql${NC}"
echo -e "${CYAN}   Headers: {${NC}"
echo -e "${CYAN}     \"Authorization\": \"Bearer ghp_abcdef1234567890...\",${NC}"
echo -e "${CYAN}     \"Content-Type\": \"application/json\"${NC}"
echo -e "${CYAN}   }${NC}"
echo -e "${CYAN}   Body: {\"query\":\"query { viewer { login } }\"}...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

sleep 0.5

echo -e "${CYAN}🌐 [$req_id] NETWORK RESPONSE${NC}"
echo -e "${CYAN}   Status: 200${NC}"
echo -e "${CYAN}   Time: 250ms${NC}"
echo -e "${CYAN}   Response: {\"data\":{\"viewer\":{\"login\":\"admin\"}}}...${NC}"
echo ""

sleep 0.2

echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}🔌 [$req_id] MCP SERVER CONNECTION${NC}"
echo -e "${MAGENTA}   Server: github-pr-mcp-server${NC}"
echo -e "${MAGENTA}   Transport: streamable-http${NC}"
echo -e "${MAGENTA}   Status: ✅ connected${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

sleep 0.2

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 [$req_id] TOOL CALL${NC}"
echo -e "${BLUE}   Tool: get_pull_request_details${NC}"
echo -e "${BLUE}   Server: github-pr-mcp-server${NC}"
echo -e "${BLUE}   Arguments: {${NC}"
echo -e "${BLUE}     \"owner\": \"microsoft\",${NC}"
echo -e "${BLUE}     \"repo\": \"vscode\",${NC}"
echo -e "${BLUE}     \"pull_number\": 123${NC}"
echo -e "${BLUE}   }${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

sleep 0.8

echo -e "${BLUE}🎯 [$req_id] TOOL RESPONSE${NC}"
echo -e "${BLUE}   Tool: get_pull_request_details${NC}"
echo -e "${BLUE}   Duration: 1250ms${NC}"
echo -e "${BLUE}   Success: ✅${NC}"
echo -e "${BLUE}   Result: {${NC}"
echo -e "${BLUE}     \"id\": 123,${NC}"
echo -e "${BLUE}     \"title\": \"Fix memory leak in extension host\",${NC}"
echo -e "${BLUE}     \"state\": \"open\"${NC}"
echo -e "${BLUE}   }...${NC}"
echo ""

sleep 0.3

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}✅ [$req_id] REQUEST COMPLETED${NC}"
echo -e "${CYAN}   Status: 200${NC}"
echo -e "${CYAN}   Duration: 1532ms${NC}"
echo -e "${CYAN}   Response: {${NC}"
echo -e "${CYAN}     \"success\": true,${NC}"
echo -e "${CYAN}     \"data\": {...}${NC}"
echo -e "${CYAN}   }...${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}🎉 Debug Flow Demo Complete!${NC}"
