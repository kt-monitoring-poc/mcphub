# 업스트림 세션 스토어 (Redis) 설계 및 가이드

> 🎯 **MCPHub v3.1+ 핵심 목표**: 여러 클라이언트가 하나의 업스트림 MCP 서버 세션을 공유하여 메모리 효율성과 성능을 극대화합니다.

## 📋 세션 관리 목표

**기본 원칙**: `Client(Cursor) → MCPHub → MCP Server` 구조에서 **업스트림 세션 통합**

```
🔄 세션 플로우:
Client₁ ┐
Client₂ ├→ MCPHub (Redis) → MCP Server (단일 세션)
Client₃ ┘     ↑ 저장/재사용      ↑ 메모리 절약
```

### 핵심 개념
- **클라이언트 세션**: MCPHub가 부여하는 임시 세션 (저장 불필요)
- **업스트림 세션**: MCP 서버가 제공하는 `Mcp-Session-Id`를 Redis에 저장하여 재사용
- **목표**: 70명의 동시 사용자가 하나의 업스트림 세션을 공유하여 MCP 서버 리소스 최적화

### 기술적 세부사항
- 헤더: `Mcp-Session-Id`
  - 초기화 응답 시 서버가 할당할 수 있음 → 이후 요청에 반드시 포함
  - 서버가 404 반환 시 세션 재수립 필요
- 컨텍스트 키(contextKey)
  - `shared`: 토큰이 필요 없는 서버 공용 세션
  - `tok:<TOKEN_KEYS_JOINED>`: 사용자 토큰셋 키 이름을 정렬 후 조인한 값

### 저장 형태 (Redis)
- 키: `mcp:upstream:session:${serverName}:${contextKey}`
- 값: `Mcp-Session-Id`
- TTL: 기본 3600초

### 코드 위치
- `src/services/redisSessionStore.ts`
  - `getSessionId`, `setSessionId`, `deleteSessionId`
- `src/services/mcpService.ts`
  - StreamableHTTP 연결 성공 후 `transport.sessionId`를 Redis 저장
  - 이후 동일 컨텍스트에서는 저장된 세션을 재사용할 수 있도록 확장 예정

### 환경변수
- `REDIS_URL` (기본: `redis://127.0.0.1:6379`)
- `.env.example`에 예시 포함

### 테스트 가이드(수동)
1) 서버 실행
```bash
export REDIS_URL=redis://127.0.0.1:6379
DEBUG_MCPHUB=true NODE_ENV=development PORT=3000 pnpm backend:dev
```

2) 키 지정 후 호출 (도구/프롬프트 확인)
```bash
export HUBKEY=mcphub_실제키값

# offerings/list → 200
curl -sS -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Protocol-Version: 2025-06-18" \
  -H "Authorization: Bearer $HUBKEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"offerings/list","params":{}}'

# tools/list → 200, 도구 N개
curl -sS -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Protocol-Version: 2025-06-18" \
  -H "Authorization: Bearer $HUBKEY" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

# prompts/list → 200 (빈 배열 가능)
curl -sS -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Protocol-Version: 2025-06-18" \
  -H "Authorization: Bearer $HUBKEY" \
  -d '{"jsonrpc":"2.0","id":3,"method":"prompts/list","params":{}}'
```

### 로그 확인 포인트
- `📨 업스트림 요청에 세션 적용(<server>): <sessionId>`: 재사용 주입된 세션
- `🪪 서버 세션 확인(<server>): <sessionId>`: 초기화 응답에서 확인된 세션
- `💾 업스트림 세션 저장 (<server>/<contextKey>): <sessionId>`: Redis 저장 확인

3) Redis 확인 (선택)
- `redis-cli GET mcp:upstream:session:<server>:<contextKey>`

### 향후 확장
 - 초기 연결 전 Redis에서 세션 로드 후 `StreamableHTTPClientTransport` 생성 시 `sessionId` 옵션 주입 (적용됨)
 - 404/400 응답 시 세션 삭제 및 재시도 정책 (적용됨)
 - 세션 메트릭/관리 API 제공 (조회/삭제/TTL 갱신) (일부 적용)

### 관리 API
- `GET /api/admin/upstream-sessions`
  - 반환: `[ { serverName, contextKey, sessionId, ttl } ]`
- `DELETE /api/admin/upstream-sessions/:serverName/:contextKey`
  - 특정 세션 삭제 (다음 요청에서 재수립)

### 세션 미발급/미노출 서버 증거(예: GitHub PR MCP 서버)
- 목적: 업스트림이 `Mcp-Session-Id`를 발급/노출하지 않는 경우, 세션 재사용 로그가 비어있음을 증명
- 재현 절차(예):
  1) 서버를 디버그로 기동 후 GitHub PR 툴 반복 호출
     ```bash
DEBUG_MCPHUB=true PORT=3000 pnpm backend:dev
# 별도 터미널에서, 허브 키로 GitHub PR API 호출(동시/반복은 동시성 문서 참고)
curl -sS -X POST http://localhost:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'Mcp-Protocol-Version: 2025-06-18' \
  -H "Authorization: Bearer $HUBKEY" \
  -d '{"jsonrpc":"2.0","id":100,"method":"tools/call","params":{"name":"get_pull_requests","arguments":{"owner":"jungchihoon","repo":"mcphub","state":"open","limit":3}}}'
     ```
  2) 세션 로그 키워드 부재 확인(📨/🪪/💾/♻️)
     ```bash
egrep "📨|🪪|💾|♻️" server.log | tail -n 50
# (출력 없음)
     ```
  3) Redis/관리 API 확인(세션 비어있음)
     ```bash
curl -sS -H "x-auth-token: $TOKEN" http://localhost:3000/api/admin/upstream-sessions | jq .
# {
#   "success": true,
#   "data": []
# }
     ```
- 결론: 해당 업스트림은 세션 헤더를 사용하지 않으므로, 허브 측 세션 재사용 로그가 남지 않는 것이 정상 동작임

### 로컬 세션 테스트 서버(get_session_id)로 세션 재사용 증적 확보
- 목적: Streamable HTTP 응답 헤더 `Mcp-Session-Id`를 제공하는 샘플 서버와 허브 연동 후, 동일 세션 재사용(📨/🪪/💾)을 검증
- 샘플 서버 경로: `servers/fastmcp-session-test/server.js`
- 기동
  ```bash
node servers/fastmcp-session-test/server.js > /tmp/local_fastmcp.log 2>&1 &
sleep 1
curl -sS -X POST http://127.0.0.1:8124/mcp/ \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' -D - | \
  awk 'tolower($0) ~ /mcp-session-id/ {print}'
# 기대: Mcp-Session-Id: sess-local-12345
  ```
- 허브 재기동 및 도구 확인
  ```bash
DEBUG_MCPHUB=true PORT=3000 pnpm -s backend:dev > /tmp/mcphub_debug.log 2>&1 &
sleep 4
HUBKEY=mcphub_... # (또는 /api/auth/login → /api/oauth/keys → full-value 순서로 획득)
curl -sS -X POST http://localhost:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'Mcp-Protocol-Version: 2025-06-18' \
  -H "Authorization: Bearer $HUBKEY" \
  -d '{"jsonrpc":"2.0","id":101,"method":"tools/list","params":{}}' | \
  jq -r '.result.tools[]?.name' | grep get_session_id
# 기대: get_session_id
  ```
- 반복 호출 및 로그 확인
  ```bash
for i in 1 2 3; do
  curl -sS -X POST http://localhost:3000/mcp \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json, text/event-stream' \
    -H 'Mcp-Protocol-Version: 2025-06-18' \
    -H "Authorization: Bearer $HUBKEY" \
    -d '{"jsonrpc":"2.0","id":400,"method":"tools/call","params":{"name":"get_session_id","arguments":{}}}'; echo; done

egrep "📨|🪪|💾|♻️" /tmp/mcphub_debug.log | tail -n 80
# 기대 로그 예시:
# 🪪 서버 세션 확인(local-fastmcp-session): sess-local-12345
# 💾 업스트림 세션 저장 (local-fastmcp-session/shared): sess-local-12345
# 📨 재사용 업스트림 세션 주입 (local-fastmcp-session): sess-local-12345
  ```
- 문제 해결 팁
  - tools/call이 지연되면 허브 구동 직후 도구 임베딩/연결 재구성 중일 수 있음 → 수 초 후 재시도
  - 샘플 서버는 SSE 응답을 사용하므로 `Accept: text/event-stream` 포함 권장

### 타부서 MCP 서버와 대조 테스트 가이드
1) 동일 시나리오를 두 서버(MCPHub ↔ 대상 MCP 서버 직접)로 각각 수행합니다.
   - offerings/list → tools/list → tools/call(간단한 인자 포함)
2) 비교 지표
   - 세션 ID 흐름: 초기화 응답 세션, 이후 요청에 세션 주입 여부(허브 로그의 🪪/📨/💾 항목)
   - 재사용 여부: 동일 컨텍스트에서 세션 값 동일 유지 여부
   - 오류 처리: 404/400 수신 시 세션 삭제 후 재수립(허브 로그에서 ♻️ 표시) 및 성공 여부
3) 확인 방법
   - 허브 로그: `server-*.log`의 키워드 검색(🪪, 📨, 💾, ♻️)
   - 대상 서버 로그: 초기화/요청 헤더의 `Mcp-Session-Id` 값 일치 여부
4) 합격 기준
   - 최소 2회 연속 호출에서 동일 세션 유지 또는 만료 시 자동 재수립 성공
   - tools/list 200 지속, tools/call 정상 동작


