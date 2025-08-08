## Cursor IDE 통합 가이드 (2025-08-08 업데이트)

이 문서는 Cursor IDE에서 MCPHub를 안정적으로 연결하여 도구 목록과 프롬프트가 정상 노출되도록 하는 최종 가이드입니다. 본 가이드는 최근 "No tools or prompts" 문제를 해결한 변경사항을 반영합니다.

### 핵심 요약
- 반드시 `type: "streamable-http"` + `url: "http://localhost:3000/mcp"`를 사용합니다.
- Authorization 헤더로 MCPHub Key를 전달합니다: `Bearer mcphub_...`
- 초기 협상(offerings/capabilities)과 `tools/list`, `prompts/list`는 허브가 직접 처리하여 200 응답을 보장합니다.

### Cursor 설정 예시 (`~/.cursor/mcp.json`)
```json
{
  "mcp-hub": {
    "type": "streamable-http",
    "url": "http://localhost:3000/mcp",
    "headers": {
      "Authorization": "Bearer mcphub_실제키값"
    }
  }
}
```

### 동작 확인용 cURL
```bash
export HUBKEY=mcphub_실제키값

# offerings/list 확인 (200 기대)
curl -sS -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Protocol-Version: 2025-06-18" \
  -H "Authorization: Bearer $HUBKEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"offerings/list","params":{}}'

# tools/list 확인 (200 기대)
curl -sS -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Protocol-Version: 2025-06-18" \
  -H "Authorization: Bearer $HUBKEY" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

# prompts/list 확인 (200, 빈 배열이라도 반환)
curl -sS -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Protocol-Version: 2025-06-18" \
  -H "Authorization: Bearer $HUBKEY" \
  -d '{"jsonrpc":"2.0","id":3,"method":"prompts/list","params":{}}'
```

### 이번에 적용된 호환성 조치
- `src/services/mcpService.ts`
  - MCP SDK 표준에 맞춰 `Server.setRequestHandler`에 Zod 리터럴 스키마로 다음 핸들러 등록: `capabilities`, `capabilities/list`, `offerings/list`.
  - 초기 협상 단계에서 `-32601`이 발생하지 않도록 SDK 계층에서 직접 응답.
  - StreamableHTTP 업스트림 세션 재사용: 초기화 응답의 `Mcp-Session-Id`를 Redis(`redis://127.0.0.1:6379` 기본) 에 저장하고 이후 요청에 재사용.

- `src/services/sseService.ts`
  - `POST /mcp`에서 초기 협상 메서드(`offerings/list`, `capabilities`, `capabilities/list`)를 항상 직접 처리.
  - 일부 클라이언트가 사용하는 배치(JSON 배열) 초기 협상 요청도 전부 직접 응답하도록 지원.
  - `tools/list`, `tools/call`, `prompts/list`를 세션 ID와 무관하게 허브가 직접 처리하여 200 보장.
  - Streamable HTTP 전송의 스트림 레벨 이벤트 후킹(`onmessage`)로 초기 협상 메시지 로깅/대응 강화.

### 왜 필요한가
- 일부 클라이언트(특히 Cursor)는 초기 단계에서 `offerings/list` 또는 `capabilities` 계열을 먼저 호출하고, 실패 시 UI를 "No tools or prompts"로 고정하는 동작이 있습니다.
- MCP SDK 기본 Server는 위 메서드가 없으면 `-32601 Method not found`를 반환하므로, 허브가 이 초기 협상 경로를 선제적으로 가로채 200으로 응답해야 합니다.
- 또한 `prompts/list`가 비어 있어도 UI가 막히는 경우가 있어, 허브가 최소 빈 배열이라도 반환하도록 처리했습니다.

### 주의사항 및 트러블슈팅
- SSE(`/sse`)는 GET 채널 전용이며, 일부 클라이언트가 `POST /sse` 또는 `/register`를 시도할 수 있습니다. MCPHub는 해당 경로를 제공하지 않습니다. 반드시 `streamable-http` + `/mcp`를 사용하세요.
- 캐시 문제로 동일 URL 재시도 시에도 변화가 없으면, 서버 항목을 삭제 후 재등록하거나 URL에 쿼리(`?v=2`)를 추가하여 캐시를 무력화하세요.
- 여전히 문제가 지속되면, 재현 시각을 기준으로 서버 로그를 대조해 초기 협상 → `tools/list` 흐름을 확인합니다.

### 버전
- MCP Protocol: 2025-06-18
- 적용일: 2025-08-08


