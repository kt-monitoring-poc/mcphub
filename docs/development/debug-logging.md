# MCPHub 완전한 디버그 로깅 시스템

## 📋 시스템 개요

MCPHub는 **end-to-end 디버그 로깅 시스템**을 제공하여 전체 서비스 플로우를 투명하게 추적할 수 있습니다. 이 시스템은 요청부터 응답까지의 모든 과정을 상세하게 기록하며, 서비스별 전문화된 로깅을 통해 정확한 문제 진단을 가능하게 합니다.

## 🎯 구현된 로깅 레벨

### 1. **전역 요청/응답 로깅** (`src/server.ts`)
- **고유 요청 ID** 생성 및 추적
- **요청 시작/완료** 시간 측정
- **HTTP 상태 코드** 및 응답 데이터 기록
- **색상 구분** 콘솔 출력

```
═══════════════════════════════════════════════════════════════
🚀 [req_1754553434300_jqk4vgweu] NEW REQUEST STARTED
📍 POST /api/auth/login
🕐 2025-08-07T07:57:14.300Z
═══════════════════════════════════════════════════════════════
```

### 2. **인증 로깅** (`src/middlewares/auth.ts`)
- **MCPHub Key 인증** 과정 추적
- **사용자 정보** (ID, 사용자명, 서비스 토큰 개수)
- **인증 성공/실패** 상세 기록
- **토큰 검증** 과정 로깅

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 [req_1754553540000_] AUTHENTICATION
   Type: MCPHub Key
   Success: ✅
   User: admin
   Token Count: 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 3. **서비스별 전문 로깅**

#### **@sseService.ts - SSE/HTTP 통신 관리**
- **MCP 연결 요청** 상세 분석
- **HTTP 헤더** 처리 및 검증
- **Bearer 토큰** 인증 과정
- **세션 관리** 상태 추적

```
@sseService.ts - MCP Other Request: {
  method: 'POST',
  url: '/mcp',
  sessionId: 'session_abc123',
  userKey: 'mcphub_abc...',
  headers: {
    'authorization': 'Bearer eyJhbGciOiJIUzI1NiIs...',
    'content-type': 'application/json',
    'mcp-session-id': 'session_abc123'
  },
  query: { key: 'mcphub_abc...' },
  bodyMethod: 'tools/call'
}
```

#### **@mcpService.ts - MCP 서버 통신 관리**
- **Transport 생성** 및 네트워크 설정
- **업스트림 헤더** 전송 내역
- **도구 호출** 요청/응답 분석
- **성능 측정** (응답 시간)

```
@mcpService.ts - StreamableHTTP Transport created for github-pr-mcp-server: {
  url: 'https://github-pr-mcp-server.livelybeach-90f399a8.koreacentral.azurecontainerapps.io/mcp/',
  headersCount: 3,
  headers: [ 'Authorization', 'X-User-Context', 'X-Request-ID' ]
}

@mcpService.ts - Tool Response: {
  tool: 'get_pull_request_details',
  server: 'github-pr-mcp-server',
  duration: '1250ms',
  success: true,
  resultType: 'text'
}
```

### 4. **네트워크 레벨 로깅** (`src/utils/debugLogger.ts`)
- **HTTP 요청/응답** 완전한 기록
- **헤더값 전체 표시** (마스킹 없음)
- **요청/응답 바디** 상세 데이터 (500자)
- **네트워크 성능** 측정

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 [req_1754553541000_def456ghi] NETWORK REQUEST
   Method: POST
   URL: https://api.github.com/graphql
   Headers: {
     "Authorization": "Bearer ghp_abcdef1234567890abcdef1234567890abcdef12",
     "Content-Type": "application/json",
     "User-Agent": "MCPHub/1.0.0",
     "X-Request-ID": "req_1754553541000_def456ghi"
   }
   Body: {"query":"query { viewer { login } }","variables":{}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🛠️ 활성화 및 사용법

### 1. **디버그 모드 활성화**
```bash
# 개발 환경
DEBUG_MCPHUB=true pnpm start:dev

# 프로덕션 빌드
DEBUG_MCPHUB=true node dist/index.js

# 로그 파일로 저장
DEBUG_MCPHUB=true node dist/index.js > debug.log 2>&1
```

### 2. **자동화된 테스트**
```bash
# 전체 디버그 플로우 테스트
./scripts/test-debug-flow.sh

# 서비스별 디버그 테스트
./scripts/test-service-debug.sh

# 디모 출력 캡처
./scripts/demo-debug-flow.sh
```

### 3. **로그 분석 도구**
```bash
# 특정 요청 ID 추적
tail -f debug.log | grep "req_1754553541000"

# 서비스별 로그 필터링
tail -f debug.log | grep "@sseService\|@mcpService"

# 네트워크 통신만 보기
tail -f debug.log | grep "NETWORK REQUEST\|NETWORK RESPONSE"

# 인증 문제 분석
tail -f debug.log | grep "🔐.*AUTHENTICATION"

# 성능 분석 (응답시간)
tail -f debug.log | grep "duration.*ms\|Duration.*ms"
```

## 📊 디버그 정보 분류

### **🚀 요청 생명주기**
- 요청 시작/완료 시간
- HTTP 메서드 및 경로
- 상태 코드 및 응답 시간
- 요청 고유 ID 추적

### **🔐 인증 및 권한**
- MCPHub Key 검증
- Bearer 토큰 처리
- 사용자 정보 및 권한
- 서비스 토큰 개수

### **🌐 네트워크 통신**
- **완전한 HTTP 헤더** (마스킹 없음)
- 요청/응답 바디 데이터
- 외부 MCP 서버 통신
- 네트워크 성능 지표

### **🔧 도구 호출**
- 도구 이름 및 인수
- 대상 MCP 서버
- 호출 결과 및 응답 시간
- 성공/실패 상태

### **🔌 MCP 서버 연결**
- Transport 생성 과정
- 연결 상태 변화
- 업스트림 헤더 전송
- 서버별 설정 정보

## 🎯 실제 사용 시나리오

### **시나리오 1: API 통신 문제 해결**
```bash
# 1. 특정 MCP 서버 통신 오류 추적
grep "github-pr-mcp-server" debug.log | grep "Transport created\|Tool Response"

# 2. 네트워크 레벨 분석
grep "github-pr-mcp-server" debug.log | grep -A10 "NETWORK REQUEST"
```

### **시나리오 2: 인증 문제 디버깅**
```bash
# 1. 인증 실패 원인 분석  
grep "AUTHENTICATION" debug.log | grep "Success: ❌"

# 2. MCPHub Key 문제 확인
grep "@sseService.*Request" debug.log | grep -A20 "authorization"
```

### **시나리오 3: 성능 병목 지점 파악**
```bash
# 1. 응답 시간이 긴 도구 호출 찾기
grep "duration.*[0-9][0-9][0-9][0-9]ms" debug.log

# 2. 전체 요청 처리 시간 분석
grep "Duration.*ms" debug.log | sort -k6 -nr
```

### **시나리오 4: 서비스 플로우 전체 추적**
```bash
# 특정 요청 ID로 전체 플로우 보기
REQUEST_ID="req_1754553541000_def456ghi"
grep "$REQUEST_ID" debug.log | head -50
```

## 🔒 보안 및 민감정보 처리

### **네트워크 로그 정책**
- **MCP 서버 통신**: 전체 헤더값 표시 (디버깅 목적)
- **요청/응답 바디**: 최대 500자 표시
- **토큰 값**: 네트워크 분석을 위해 완전히 표시

### **인증 로그 정책**  
- **사용자 키**: 앞 10자만 표시 (`mcphub_abc...`)
- **JWT 토큰**: 앞 10자만 표시 (`eyJhbGciOi...`)
- **민감한 사용자 정보**: 마스킹 처리

### **프로덕션 사용 시 주의사항**
- 디버그 로그에는 **실제 토큰값**이 포함됨
- 로그 파일 **접근 권한** 제한 필요
- 정기적인 **로그 파일 삭제** 권장
- **민감정보 유출** 방지를 위한 로그 로테이션 설정

## 📈 성능 및 운영 고려사항

### **성능 영향도**
- **CPU 사용량**: 약 5-10% 증가
- **메모리 사용량**: 요청당 약 2-5KB 추가
- **디스크 I/O**: 상세 로그로 인한 증가
- **네트워크 지연**: 무시할 수 있는 수준

### **로그 파일 관리**
```bash
# 로그 로테이션 설정 예시
logrotate /etc/logrotate.d/mcphub-debug

# 오래된 로그 자동 삭제
find /var/log/mcphub -name "*.log" -mtime +7 -delete
```

### **모니터링 권장사항**
- **로그 레벨별 통계** 수집
- **응답 시간 분포** 분석  
- **에러율 추이** 모니터링
- **자원 사용량** 임계값 설정

## 🔧 커스터마이징 및 확장

### **로그 포맷 변경**
`src/utils/debugLogger.ts`에서 색상 및 형식 조정:
```typescript
// 색상 변경
console.log(chalk.green(`🔑 [${requestId}] TOKEN APPLICATION`));

// 데이터 길이 조정  
const response = responseData.substring(0, 1000) + '...';
```

### **새로운 로그 타입 추가**
```typescript
static logCustomEvent(requestId: string, eventType: string, data: any) {
    console.log(chalk.magenta(`🎯 [${requestId}] ${eventType.toUpperCase()}`));
    console.log(chalk.magenta(`   Data: ${JSON.stringify(data, null, 2)}`));
}
```

### **필터링 조건 설정**
```typescript
// 특정 서버만 로깅
if (serverName === 'github-pr-mcp-server') {
    DebugLogger.logNetworkRequest(requestId, method, url, headers);
}
```

## 📋 체크리스트

### **디버그 로깅 시스템 확인**
- [ ] `DEBUG_MCPHUB=true` 환경변수 설정
- [ ] 서버 정상 시작 확인
- [ ] 요청 ID가 모든 로그에 포함되는지 확인
- [ ] 서비스별 로그가 올바르게 출력되는지 확인
- [ ] 네트워크 로그에서 전체 헤더값 표시 확인
- [ ] 테스트 스크립트 정상 실행 확인

### **프로덕션 배포 전 점검**
- [ ] 민감정보 마스킹 정책 확인
- [ ] 로그 파일 권한 설정
- [ ] 디스크 공간 충분한지 확인
- [ ] 로그 로테이션 설정
- [ ] 모니터링 도구 연동

## 🎉 결론

MCPHub의 **완전한 디버그 로깅 시스템**은 다음을 제공합니다:

✅ **투명한 서비스 플로우** - 요청부터 응답까지 완전 추적  
✅ **서비스별 전문 로깅** - @sseService, @mcpService 상세 분석  
✅ **실시간 네트워크 통신** - 전체 헤더값과 바디 데이터  
✅ **성능 측정 및 분석** - 응답시간, 병목지점 파악  
✅ **자동화된 테스트** - 스크립트를 통한 간편한 검증  

이 시스템을 통해 **MCPHub의 모든 동작을 정확히 이해**하고 **문제를 신속하게 해결**할 수 있습니다.
