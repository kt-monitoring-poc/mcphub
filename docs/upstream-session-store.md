## 업스트림 세션 스토어 (Redis) 설계 및 가이드

목표: MCPHub가 MCP 서버와의 StreamableHTTP 세션(`Mcp-Session-Id`)을 서버별/컨텍스트별로 재사용하여 안정성과 성능을 높입니다.

### 핵심 개념
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

3) Redis 확인 (선택)
- `redis-cli GET mcp:upstream:session:<server>:<contextKey>`

### 향후 확장
 - 초기 연결 전 Redis에서 세션 로드 후 `StreamableHTTPClientTransport` 생성 시 `sessionId` 옵션 주입 (적용됨)
 - 404/400 응답 시 세션 삭제 및 재시도 정책 (다음 단계)
 - 세션 메트릭/관리 API 제공 (조회/삭제/TTL 갱신) (일부 적용)

### 관리 API
- `GET /api/admin/upstream-sessions`
  - 반환: `[ { serverName, contextKey, sessionId, ttl } ]`
- `DELETE /api/admin/upstream-sessions/:serverName/:contextKey`
  - 특정 세션 삭제 (다음 요청에서 재수립)


