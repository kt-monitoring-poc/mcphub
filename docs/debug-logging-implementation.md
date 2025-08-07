# MCPHub 디버그 로깅 시스템 구현 문서

## 📋 개요

**목적**: MCPHub의 End-to-End 요청 플로우를 완벽히 추적하고 디버깅할 수 있는 상세 로깅 시스템 구현

**브랜치**: `feature/debug-logging-analysis`  
**버전**: v3.1.1-debug  
**작업일**: 2025-08-07

## 🎯 구현 목표

1. **전체 요청 플로우 시각화**: 프론트엔드 → 백엔드 → MCP 서버까지의 모든 단계 추적
2. **네트워크 레벨 로깅**: HTTP 요청/응답, 헤더, 바디 정보 포함
3. **성능 측정**: 각 단계별 소요 시간 측정
4. **에러 추적**: 정확한 에러 발생 지점 파악
5. **보안**: 민감한 정보 자동 마스킹

## 🏗️ 구현 내용

### 1. 핵심 디버그 로거 클래스 (`src/utils/debugLogger.ts`)

```typescript
export class DebugLogger {
  // 요청별 컨텍스트 관리
  private static contexts = new Map<string, RequestContext>();
  
  // 주요 메서드
  static createContext(req: any): string
  static logAuth(requestId: string, authType: string, authData: any, success: boolean)
  static logDB(requestId: string, operation: string, table: string, data?: any)
  static logMCPConnection(requestId: string, serverName: string, transport: string, status: string)
  static logToolCall(requestId: string, toolName: string, args: any, serverName?: string)
  static logToolResponse(requestId: string, toolName: string, response: any, duration: number)
  static logTokenApplication(requestId: string, serverName: string, tokens: Record<string, string>)
  static logNetworkRequest(requestId: string, method: string, url: string, headers?: any, body?: any)
  static logNetworkResponse(requestId: string, statusCode: number, responseTime: number, responseData?: any)
  static logError(requestId: string, error: any, context?: string)
  static endRequest(requestId: string, statusCode: number, responseData?: any)
}
```

### 2. 서버 미들웨어 통합 (`src/server.ts`)

```typescript
// 디버그 로깅 미들웨어
if (DEBUG_MODE) {
  this.app.use((req, res, next) => {
    const requestId = DebugLogger.createContext(req);
    (req as any).requestId = requestId;
    
    // 응답 완료 시 자동 로깅
    const originalSend = res.send;
    const originalJson = res.json;
    
    res.send = function (data: any) {
      DebugLogger.endRequest(requestId, res.statusCode, data);
      return originalSend.call(this, data);
    };
    
    res.json = function (data: any) {
      DebugLogger.endRequest(requestId, res.statusCode, data);
      return originalJson.call(this, data);
    };
    
    next();
  });
}
```

### 3. 인증 미들웨어 로깅 (`src/middlewares/auth.ts`)

```typescript
// MCPHub Key 인증 성공 시
if (DEBUG_MODE && requestId) {
  DebugLogger.logAuth(requestId, 'MCPHub Key', {
    userId: authResult.user.id,
    username: authResult.user.username,
    mcphubKey: keyValue,
    serviceTokenCount: Object.keys(authResult.serviceTokens || {}).length
  }, true);
}
```

### 4. MCP 서비스 로깅 (`src/services/mcpService.ts`)

```typescript
// 토큰 적용 로깅
if (DEBUG_MODE && requestId) {
  DebugLogger.logTokenApplication(requestId, 'All Servers', userApiKeys);
}

// MCP 서버 연결 로깅
if (DEBUG_MODE && requestId) {
  DebugLogger.logMCPConnection(requestId, targetServerInfo.name, configWithKeys.type || 'unknown', 'connecting');
}

// 툴 호출 로깅
if (DEBUG_MODE && requestId) {
  DebugLogger.logToolCall(requestId, toolName, finalArgs, targetServerInfo.name);
}

// 툴 응답 로깅
if (DEBUG_MODE && requestId) {
  DebugLogger.logToolResponse(requestId, toolName, result, duration);
}
```

### 5. 테스트 스크립트 (`scripts/test-debug-flow.sh`)

자동화된 End-to-End 플로우 테스트를 위한 스크립트:

```bash
#!/bin/bash
# 디버그 모드 활성화
export DEBUG_MCPHUB=true
export NODE_ENV=development

# 테스트 단계
1. Health Check
2. 로그인 (JWT 토큰 획득)
3. MCP 서버 목록 조회
4. 툴 목록 조회
5. MCP offerings/list 직접 호출
6. 툴 호출 테스트
7. 환경변수 템플릿 조회
8. 스케줄러 상태 확인
```

## 📊 로그 출력 예시

### 전체 플로우
```
🚀 [req_1723021500000_abc123] NEW REQUEST STARTED
📍 POST /api/tools/call
🕐 2025-08-07T06:45:00.000Z
═══════════════════════════════════════════════════════════════

🔐 [req_1723021500000_abc123] AUTHENTICATION
   Type: JWT
   Success: ✅
   User: admin
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🗄️  [req_1723021500000_abc123] DATABASE SELECT
   Table: mcphub_keys
   Data: { userId: 1, isActive: true }

🔑 [req_1723021500000_abc123] TOKEN APPLICATION
   Server: github-pr-mcp-server
   Tokens Applied: 2
   - GITHUB_TOKEN: ghp_1234567890abcdef...
   - USER_GITHUB_TOKEN: ghp_abcdef1234567890...

🌐 [req_1723021500000_abc123] NETWORK REQUEST
   Method: POST
   URL: https://api.github.com/graphql
   Headers: {
     "Authorization": "Bearer ghp_1234567890...",
     "Content-Type": "application/json"
   }
   Body: {"query":"query { viewer { login } }"}...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 [req_1723021500000_abc123] NETWORK RESPONSE
   Status: 200
   Time: 250ms
   Response: {"data":{"viewer":{"login":"username"}}}...

🔌 [req_1723021500000_abc123] MCP SERVER CONNECTION
   Server: github-pr-mcp-server
   Transport: streamable-http
   Status: ✅ connected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 [req_1723021500000_abc123] TOOL CALL
   Tool: get_pull_request_details
   Server: github-pr-mcp-server
   Arguments: {
     "owner": "microsoft",
     "repo": "vscode",
     "pull_number": 123
   }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 [req_1723021500000_abc123] TOOL RESPONSE
   Tool: get_pull_request_details
   Duration: 1250ms
   Success: ✅
   Result: {
     "id": 123,
     "title": "Fix memory leak",
     "state": "open"
   }...

✅ [req_1723021500000_abc123] REQUEST COMPLETED
   Status: 200
   Duration: 1532ms
   Response: {"success": true, "data": {...}}...
═══════════════════════════════════════════════════════════════
```

## 🔧 구현 세부사항

### 1. 요청 ID 생성
- 형식: `req_${timestamp}_${random}`
- 모든 로그에 포함되어 전체 플로우 추적 가능

### 2. 색상 코딩
- 🚀 시작/종료: Cyan
- 🔐 인증: Yellow
- 🗄️ DB: Green
- 🔌 MCP 연결: Magenta
- 🔧 툴 실행: Blue
- 🌐 네트워크: Cyan
- ❌ 에러: Red

### 3. 민감정보 보호
- 토큰: 앞 20자만 표시
- 패스워드: [REDACTED]로 마스킹
- Authorization 헤더: 부분 마스킹

### 4. 성능 측정
- 각 단계별 타임스탬프 기록
- 툴 실행 시간 측정
- 전체 요청 처리 시간 계산

## 🚀 사용 방법

### 1. 환경변수 설정
```bash
export DEBUG_MCPHUB=true
export NODE_ENV=development
```

### 2. 서버 시작
```bash
DEBUG_MCPHUB=true pnpm start:dev
```

### 3. 테스트 실행
```bash
./scripts/test-debug-flow.sh
```

### 4. 로그 필터링
```bash
# 특정 요청만 보기
pnpm start:dev | grep "req_1723021500000"

# 네트워크 요청만 보기
pnpm start:dev | grep "NETWORK" -A 5

# 에러만 보기
pnpm start:dev | grep "❌"
```

## 📈 활용 시나리오

### 1. 연결 실패 디버깅
```
🔌 [req_xxx] MCP SERVER CONNECTION
   Server: github-pr-mcp-server
   Transport: streamable-http
   Status: ❌ failed
   Error: ECONNREFUSED
```

### 2. 인증 문제 추적
```
🔐 [req_xxx] AUTHENTICATION
   Type: MCPHub Key
   Success: ❌
   Error: Key expired
```

### 3. 네트워크 지연 분석
```
🌐 [req_xxx] NETWORK RESPONSE
   Status: 200
   Time: 5230ms  ← 5초 지연!
```

### 4. 토큰 적용 검증
```
🔑 [req_xxx] TOKEN APPLICATION
   Server: github-pr-mcp-server
   Tokens Applied: 0  ← 토큰 없음!
```

## 🚨 주의사항

1. **프로덕션 환경에서 비활성화 필수**
   - 성능 오버헤드 (약 5-10%)
   - 로그 파일 크기 급증
   - 민감정보 노출 위험

2. **로그 관리**
   - 로그 로테이션 설정 권장
   - 디스크 공간 모니터링
   - 정기적인 로그 정리

3. **보안 고려사항**
   - 로그 파일 접근 권한 제한
   - 민감정보 추가 마스킹 검토
   - 로그 전송 시 암호화

## 🎯 향후 개선사항

1. **로그 레벨 설정**
   - DEBUG, INFO, WARN, ERROR 레벨 구분
   - 환경변수로 레벨 조정

2. **로그 저장**
   - 파일 시스템 저장 옵션
   - 로그 집계 서비스 연동

3. **성능 모니터링**
   - 메트릭 수집
   - 대시보드 연동

4. **분산 추적**
   - OpenTelemetry 통합
   - 분산 시스템 추적

## 📚 관련 문서

- [디버그 로깅 가이드](./debug-logging-guide.md)
- [MCPHub 프로젝트 상태](./mcphub-project-status.md)
- [API 레퍼런스](./api-reference.md)

---

이 디버그 로깅 시스템은 MCPHub의 복잡한 요청 플로우를 완벽히 이해하고 문제를 빠르게 해결할 수 있도록 설계되었습니다.
