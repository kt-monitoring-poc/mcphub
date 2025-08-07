# MCPHub 디버그 로깅 가이드

> **📝 최신 문서**: 전체 시스템 개요는 [`debug-logging-system-final.md`](./debug-logging-system-final.md)를 참조하세요.

## 📋 개요

MCPHub의 End-to-End 요청 플로우를 디버그하기 위한 상세 로깅 시스템입니다.

**버전**: v3.1.1-debug  
**브랜치**: `feature/debug-logging-analysis`

## 🚀 디버그 모드 활성화

### 1. 환경변수 설정

```bash
# 디버그 모드 활성화
export DEBUG_MCPHUB=true
export NODE_ENV=development

# 또는 .env 파일에 추가
DEBUG_MCPHUB=true
NODE_ENV=development
```

### 2. 서버 시작

```bash
# 디버그 모드로 서버 시작
DEBUG_MCPHUB=true pnpm start:dev
```

## 🔍 디버그 로그 구조

### 요청 플로우 시각화

```
🚀 [req_1234567890_abc123def] NEW REQUEST STARTED
📍 POST /api/tools/call
🕐 2025-08-07T15:45:00.000Z
═══════════════════════════════════════════════════════════════

🔐 [req_1234567890_abc123def] AUTHENTICATION
   Type: JWT
   Success: ✅
   User: admin
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🗄️  [req_1234567890_abc123def] DATABASE SELECT
   Table: mcphub_keys
   Data: { userId: 1, isActive: true }

🔑 [req_1234567890_abc123def] TOKEN APPLICATION
   Server: github-pr-mcp-server
   Tokens Applied: 2
   - GITHUB_TOKEN: ghp_1234567890abcdef...
   - USER_GITHUB_TOKEN: ghp_abcdef1234567890...

🔌 [req_1234567890_abc123def] MCP SERVER CONNECTION
   Server: github-pr-mcp-server
   Transport: streamable-http
   Status: ✅ connected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 [req_1234567890_abc123def] TOOL CALL
   Tool: get_pull_request_details
   Server: github-pr-mcp-server
   Arguments: {
     "owner": "microsoft",
     "repo": "vscode",
     "pull_number": 123
   }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 [req_1234567890_abc123def] TOOL RESPONSE
   Tool: get_pull_request_details
   Duration: 1250ms
   Success: ✅
   Result: {
     "id": 123,
     "title": "Fix memory leak in extension host",
     "state": "open"
   }...

✅ [req_1234567890_abc123def] REQUEST COMPLETED
   Status: 200
   Duration: 1532ms
═══════════════════════════════════════════════════════════════
```

## 🛠️ 디버그 플로우 테스트

### 1. 자동화된 테스트 스크립트

```bash
# 테스트 스크립트 실행
./scripts/test-debug-flow.sh
```

### 2. 수동 테스트 명령어

#### Health Check
```bash
curl -s http://localhost:3000/api/health | jq .
```

#### 로그인
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' | jq -r '.token')
```

#### MCP 서버 목록
```bash
curl -s -H "x-auth-token: $TOKEN" \
  http://localhost:3000/api/servers | jq '.servers[] | {name, type, status}'
```

#### 툴 호출
```bash
curl -s -X POST http://localhost:3000/api/tools/call \
  -H "Content-Type: application/json" \
  -H "x-auth-token: $TOKEN" \
  -d '{
    "toolName": "echo",
    "arguments": {
      "message": "Debug test message"
    }
  }' | jq .
```

## 📊 로그 분석 포인트

### 1. 인증 단계
- JWT 토큰 유효성 검증
- MCPHub Key 인증 과정
- 사용자 권한 확인

### 2. 데이터베이스 조회
- 사용자 정보 조회
- 서비스 토큰 가져오기
- 토큰 매핑 확인

### 3. MCP 서버 연결
- Transport 타입 확인 (SSE, StreamableHTTP, Stdio)
- 환경변수 템플릿 치환
- 연결 성공/실패 추적

### 4. 툴 실행
- 입력 파라미터 검증
- 서버별 라우팅
- 응답 시간 측정

## 🔧 문제 해결

### 1. 로그가 표시되지 않는 경우
```bash
# 환경변수 확인
echo $DEBUG_MCPHUB
echo $NODE_ENV

# 프로세스 재시작
pkill -f "node.*mcphub"
DEBUG_MCPHUB=true pnpm start:dev
```

### 2. 특정 요청만 디버깅
```javascript
// 코드에서 직접 활성화
import { DebugLogger } from './utils/debugLogger.js';

const requestId = DebugLogger.createContext(req);
// ... 디버그하고 싶은 로직
DebugLogger.endRequest(requestId, 200);
```

### 3. 로그 필터링
```bash
# 특정 요청 ID만 보기
pnpm start:dev | grep "req_1234567890"

# 에러만 보기
pnpm start:dev | grep "❌"

# MCP 연결만 보기
pnpm start:dev | grep "MCP SERVER CONNECTION" -A 5
```

## 📈 성능 모니터링

디버그 로그를 통해 수집할 수 있는 성능 지표:

1. **요청 응답 시간**: REQUEST COMPLETED의 Duration
2. **툴 실행 시간**: TOOL RESPONSE의 Duration
3. **DB 쿼리 빈도**: DATABASE 로그 카운트
4. **연결 실패율**: MCP SERVER CONNECTION의 failed 상태

## 🚨 주의사항

1. **프로덕션 환경에서는 비활성화**
   - 성능 오버헤드 발생
   - 민감한 정보 노출 위험

2. **로그 파일 관리**
   - 디버그 로그는 빠르게 증가
   - 정기적인 로테이션 필요

3. **민감정보 마스킹**
   - 토큰은 앞 20자만 표시
   - 패스워드는 [REDACTED]로 표시

## 🎯 활용 예시

### 1. MCP 서버 연결 실패 디버깅
```
🔌 [req_xxx] MCP SERVER CONNECTION
   Server: github-pr-mcp-server
   Transport: streamable-http
   Status: ❌ failed
   Error: ECONNREFUSED
```
→ 서버 URL 또는 포트 확인 필요

### 2. 인증 문제 추적
```
🔐 [req_xxx] AUTHENTICATION
   Type: MCPHub Key
   Success: ❌
   Error: Key expired
```
→ MCPHub Key 갱신 필요

### 3. 성능 병목 찾기
```
🎯 [req_xxx] TOOL RESPONSE
   Tool: complex_analysis
   Duration: 15230ms
   Success: ✅
```
→ 15초 소요, 최적화 필요

---

이 디버그 로깅 시스템을 활용하여 MCPHub의 End-to-End 동작을 정확히 파악하고 문제를 빠르게 해결할 수 있습니다.
