# MCPHub 서비스별 디버그 로깅 시스템

## 📋 개요

MCPHub는 서비스별 상세한 디버그 로깅을 제공하여 개발자가 각 서비스의 동작을 세밀하게 모니터링할 수 있습니다.

## 🎯 지원하는 서비스

### 1. @sseService.ts - SSE 및 HTTP 통신 관리
- MCP 연결 요청 처리
- Bearer 토큰 인증
- 세션 관리
- 헤더값 처리

### 2. @mcpService.ts - MCP 서버 통신 관리  
- MCP 서버와의 연결 설정
- 도구 호출 및 응답 처리
- 네트워크 통신 상세 로그
- 업스트림 헤더 관리

## 🔍 실제 디버그 로그 예시

### @sseService.ts 로그

```
🔌 [req_1754555251482_6wq9ac6sh] MCP SERVER CONNECTION
   Server: handleMcpOtherRequest
   Transport: http
   Status: ⏳ connecting
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@sseService.ts - MCP Other Request: {
  method: 'GET',
  url: '/mcp?sessionId=test-session',
  sessionId: undefined,
  userKey: 'none',
  headers: {
    'host': 'localhost:3000',
    'user-agent': 'curl/8.7.1',
    'accept': 'application/json,text/event-stream',
    'authorization': 'Bearer eyJhbGciOi...',
    'content-type': 'application/json'
  },
  query: { sessionId: 'test-session' },
  bodyMethod: 'none'
}
```

**주요 정보:**
- HTTP 메서드와 URL
- 세션 ID 정보
- 사용자 키 마스킹
- 모든 헤더값 (Authorization은 마스킹됨)
- 쿼리 파라미터
- 요청 바디의 메서드

### @mcpService.ts 로그

#### 1. Transport 생성 로그
```
@mcpService.ts - StreamableHTTP Transport created for mcp-atlassian-jira: {
  url: 'https://mcp-jira-service.livelybeach-90f399a8.koreacentral.azurecontainerapps.io/mcp/',
  headersCount: 3,
  headers: [ 'Authorization', 'X-User-Email', 'X-Jira-URL' ]
}
```

**주요 정보:**
- MCP 서버 이름
- 연결 URL
- 전송되는 헤더 개수
- 헤더 이름 목록

#### 2. 업스트림 헤더 로그
```
@mcpService.ts - Upstream headers for github-pr-mcp-server: {
  headers: ['X-User-Context', 'X-Request-ID', 'X-Session-ID'],
  userId: 'user_12345',
  sessionId: 'session_abcdef',
  requestId: 'req_1754555251482_6wq9ac6sh'
}
```

**주요 정보:**
- 전송된 업스트림 헤더 목록
- 사용자 ID
- 세션 ID  
- 요청 추적 ID

#### 3. 도구 호출 로그
```
@mcpService.ts - Tool Call Request: {
  tool: 'get_pull_request_details',
  arguments: { owner: 'microsoft', repo: 'vscode', pull_number: 123 },
  group: 'global',
  hasUserTokens: true,
  mcpHubKey: 'mcphub_abc...'
}
```

**주요 정보:**
- 호출할 도구 이름
- 도구 인수
- 그룹 정보
- 사용자 토큰 보유 여부
- MCPHub 키 (마스킹됨)

#### 4. 도구 응답 로그
```
@mcpService.ts - Tool Response: {
  tool: 'get_pull_request_details',
  server: 'github-pr-mcp-server',
  duration: '1250ms',
  success: true,
  resultType: 'text'
}
```

**주요 정보:**
- 도구 이름
- 응답한 서버
- 응답 시간
- 성공/실패 여부
- 응답 데이터 타입

## 🛠️ 활성화 방법

### 1. 환경변수 설정
```bash
# 디버그 모드 활성화
export DEBUG_MCPHUB=true

# 또는 서버 시작 시
DEBUG_MCPHUB=true pnpm start:dev
```

### 2. 프로덕션 빌드에서 활성화
```bash
DEBUG_MCPHUB=true node dist/index.js
```

## 📊 로그 분석 방법

### 1. 특정 서비스 로그 필터링
```bash
# SSE 서비스 로그만 보기
tail -f server.log | grep "@sseService"

# MCP 서비스 로그만 보기  
tail -f server.log | grep "@mcpService"
```

### 2. 특정 요청 추적
```bash
# 요청 ID로 전체 플로우 추적
tail -f server.log | grep "req_1754555251482_6wq9ac6sh"
```

### 3. 네트워크 통신 분석
```bash
# Transport 생성 로그
grep "Transport created" server.log

# 업스트림 헤더 확인
grep "Upstream headers" server.log

# 도구 호출 응답 시간 분석
grep "Tool Response" server.log | grep "duration"
```

## 🔧 테스트 스크립트

### 자동화된 테스트
```bash
# 서비스별 디버그 로깅 테스트
./scripts/test-service-debug.sh
```

이 스크립트는 다음을 테스트합니다:
- Health Check
- JWT 토큰 인증
- Tools 목록 조회 (@mcpService.ts)
- Tool 호출 (@sseService.ts + @mcpService.ts)
- GET 요청 처리 (@sseService.ts)

## 🚨 주의사항

### 1. 민감정보 보호
- Authorization 헤더는 앞 10자만 표시
- MCPHub 키는 앞 10자만 표시
- 사용자 키는 앞 10자만 표시

### 2. 성능 영향
- 디버그 로깅은 성능에 약간의 영향을 줄 수 있음
- 프로덕션에서는 필요시에만 활성화

### 3. 로그 파일 크기
- 상세한 로그로 인해 파일 크기가 빠르게 증가
- 로그 로테이션 설정 권장

## 📈 활용 사례

### 1. API 통신 문제 해결
```bash
# 특정 MCP 서버와의 통신 오류 추적
grep "github-pr-mcp-server" server.log | grep "Transport created\|Tool Response"
```

### 2. 인증 문제 디버깅
```bash
# 인증 실패 원인 분석
grep "@sseService.*Request" server.log | grep -A20 "authorization"
```

### 3. 성능 병목 지점 파악
```bash
# 응답 시간이 긴 도구 호출 찾기
grep "duration.*[0-9][0-9][0-9][0-9]ms" server.log
```

### 4. 헤더 전송 확인
```bash
# 업스트림 헤더가 제대로 전송되는지 확인
grep "Upstream headers" server.log | tail -10
```

## 🎯 로그 패턴 가이드

### 성공적인 도구 호출 플로우
1. `@sseService.ts - MCP Other Request` (요청 수신)
2. `🔐 헤더 기반 인증 시도` (인증 시작)
3. `@mcpService.ts - Tool Call Request` (도구 호출 시작)
4. `@mcpService.ts - StreamableHTTP Transport created` (연결 생성)
5. `@mcpService.ts - Upstream headers` (헤더 전송)
6. `@mcpService.ts - Tool Response` (응답 수신)

### 인증 실패 플로우
1. `@sseService.ts - MCP Other Request` (요청 수신)
2. `🔐 헤더 기반 인증 시도` (인증 시작)
3. `❌ 헤더 기반 인증 실패` (인증 실패)
4. `Bearer authentication required or invalid token` (오류 응답)

이 서비스별 디버그 로깅을 통해 MCPHub의 모든 동작을 투명하게 추적하고 문제를 빠르게 해결할 수 있습니다.
