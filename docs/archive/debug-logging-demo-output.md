# MCPHub 디버그 로깅 시스템 실제 동작 예시

## 📋 개요

이 문서는 MCPHub의 디버그 로깅 시스템이 실제로 어떻게 동작하는지 보여주는 예시입니다.

## 🔍 디버그 로그 출력 예시

### 1. Health Check 요청

```
═══════════════════════════════════════════════════════════════
🚀 [req_1754553539000_abc123def] NEW REQUEST STARTED
📍 GET /api/health
🕐 2025-08-07T07:58:59.123Z
═══════════════════════════════════════════════════════════════
```

- **요청 ID**: `req_1754553539000_abc123def` - 각 요청마다 고유한 ID 생성
- **메서드와 경로**: `GET /api/health`
- **타임스탬프**: ISO 형식의 정확한 시간

### 2. 로그인 요청 - 전체 플로우

```
═══════════════════════════════════════════════════════════════
🚀 [req_1754553540000_xyz789abc] NEW REQUEST STARTED
📍 POST /api/auth/login
🕐 2025-08-07T07:59:00.456Z
═══════════════════════════════════════════════════════════════

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 [req_1754553540000_xyz789abc] AUTHENTICATION
   Type: Password
   Success: ✅
   User: admin
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🗄️  [req_1754553540000_xyz789abc] DATABASE SELECT
   Table: users
   Data: { username: 'admin', isAdmin: true }

═══════════════════════════════════════════════════════════════
✅ [req_1754553540000_xyz789abc] REQUEST COMPLETED
   Status: 200
   Duration: 85ms
   Response: {
     "success": true,
     "message": "Login successful",
     "token": "eyJhbGciOiJIUzI1NiIs..."
   }...
═══════════════════════════════════════════════════════════════
```

**플로우 설명:**
1. 요청 시작 로그
2. 패스워드 인증 과정
3. DB에서 사용자 정보 조회
4. 요청 완료 및 응답 시간 (85ms)

### 3. MCP 툴 호출 - 복잡한 플로우

```
═══════════════════════════════════════════════════════════════
🚀 [req_1754553541000_def456ghi] NEW REQUEST STARTED
📍 POST /api/tools/call
🕐 2025-08-07T07:59:01.789Z
═══════════════════════════════════════════════════════════════

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 [req_1754553541000_def456ghi] AUTHENTICATION
   Type: JWT
   Success: ✅
   User: admin
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🗄️  [req_1754553541000_def456ghi] DATABASE SELECT
   Table: user_tokens
   Data: { userId: 1, serviceName: 'github-pr-mcp-server' }

🔑 [req_1754553541000_def456ghi] TOKEN APPLICATION
   Server: github-pr-mcp-server
   Tokens Applied: 1
   - GITHUB_TOKEN: ghp_abcdef1234567890...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 [req_1754553541000_def456ghi] NETWORK REQUEST
   Method: POST
   URL: https://api.github.com/graphql
   Headers: {
     "Authorization": "Bearer ghp_abcdef1234567890...",
     "Content-Type": "application/json"
   }
   Body: {"query":"query { viewer { login } }"}...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 [req_1754553541000_def456ghi] NETWORK RESPONSE
   Status: 200
   Time: 250ms
   Response: {"data":{"viewer":{"login":"admin"}}}...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔌 [req_1754553541000_def456ghi] MCP SERVER CONNECTION
   Server: github-pr-mcp-server
   Transport: streamable-http
   Status: ✅ connected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 [req_1754553541000_def456ghi] TOOL CALL
   Tool: get_pull_request_details
   Server: github-pr-mcp-server
   Arguments: {
     "owner": "microsoft",
     "repo": "vscode",
     "pull_number": 123
   }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 [req_1754553541000_def456ghi] TOOL RESPONSE
   Tool: get_pull_request_details
   Duration: 1250ms
   Success: ✅
   Result: {
     "id": 123,
     "title": "Fix memory leak in extension host",
     "state": "open"
   }...

═══════════════════════════════════════════════════════════════
✅ [req_1754553541000_def456ghi] REQUEST COMPLETED
   Status: 200
   Duration: 1532ms
   Response: {
     "success": true,
     "data": {...}
   }...
═══════════════════════════════════════════════════════════════
```

**플로우 설명:**
1. **인증**: JWT 토큰 검증
2. **DB 조회**: 사용자의 서비스 토큰 가져오기
3. **토큰 적용**: GitHub 토큰을 환경변수로 적용
4. **네트워크 요청**: GitHub API 호출 (헤더, 바디 포함)
5. **네트워크 응답**: 250ms 소요
6. **MCP 연결**: github-pr-mcp-server와 연결
7. **툴 실행**: get_pull_request_details 호출
8. **툴 응답**: 1250ms 소요, PR 정보 반환
9. **전체 완료**: 총 1532ms 소요

## 📊 디버그 로그 분석

### 성능 메트릭
- **로그인**: 85ms
- **네트워크 요청**: 250ms
- **툴 실행**: 1250ms
- **전체 요청**: 1532ms

### 병목 지점 파악
이 예시에서는 툴 실행(1250ms)이 전체 시간의 81%를 차지합니다.

### 보안 정보
- 토큰은 앞 20자만 표시: `ghp_abcdef1234567890...`
- 패스워드는 표시되지 않음
- Authorization 헤더도 마스킹됨

## 🛠️ 활용 방법

### 1. 특정 요청 추적
```bash
# 요청 ID로 전체 플로우 추적
tail -f server.log | grep "req_1754553541000_def456ghi"
```

### 2. 에러 디버깅
```
❌ [req_xxx] ERROR in MCP Connection
   Message: ECONNREFUSED
   Stack: Error: connect ECONNREFUSED 127.0.0.1:8080
```

### 3. 성능 분석
```bash
# 1초 이상 걸린 요청만 찾기
grep "Duration:" server.log | awk '$2 > 1000 {print}'
```

### 4. 인증 문제 추적
```bash
# 인증 실패만 찾기
grep "AUTHENTICATION" -A2 server.log | grep "Success: ❌" -B2
```

## 🎯 디버그 로그로 해결할 수 있는 문제들

### 1. MCP 서버 연결 실패
```
🔌 [req_xxx] MCP SERVER CONNECTION
   Server: github-pr-mcp-server
   Transport: streamable-http
   Status: ❌ failed
   Error: ECONNREFUSED - 서버가 실행 중이지 않음
```

### 2. 토큰 누락
```
🔑 [req_xxx] TOKEN APPLICATION
   Server: github-pr-mcp-server
   Tokens Applied: 0  ← 토큰이 없음!
```

### 3. 네트워크 지연
```
🌐 [req_xxx] NETWORK RESPONSE
   Status: 200
   Time: 5230ms  ← 5초 이상 소요!
```

### 4. 인증 실패
```
🔐 [req_xxx] AUTHENTICATION
   Type: MCPHub Key
   Success: ❌
   Error: Key expired - 키가 만료됨
```

## 📈 모니터링 대시보드 연동

디버그 로그를 파싱해서 다음과 같은 메트릭 수집 가능:
- 평균 응답 시간
- 에러율
- 서버별 연결 성공률
- 툴별 실행 시간

## 🚨 주의사항

1. **프로덕션에서는 비활성화**: `DEBUG_MCPHUB=false`
2. **로그 파일 크기 관리**: 로테이션 설정 필요
3. **민감정보 보호**: 토큰, 패스워드 자동 마스킹

---

이 디버그 로깅 시스템을 통해 MCPHub의 모든 동작을 투명하게 추적하고 문제를 빠르게 해결할 수 있습니다.
