# MCPHub 세션 격리 테스트 가이드

## 📋 개요

MCPHub의 다중 사용자 세션 격리 기능을 테스트하기 위한 상세 가이드입니다.

**테스트 목적**: 사용자별 요청이 올바르게 격리되고 업스트림 MCP 서버에 사용자 컨텍스트가 전파되는지 확인

---

## 🧪 **테스트 시나리오**

### **시나리오 1: 동시 다중 사용자 요청**

#### **준비사항**
1. 두 개의 서로 다른 MCPHub Key 필요
2. 각각 다른 GitHub 토큰 설정
3. 서로 다른 사용자 그룹 설정

#### **테스트 명령어**

```bash
# Terminal 1: 사용자 A
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: session-user-a-$(date +%s)" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }' \
  --url-query "key=mcphub_user_a_key_here"

# Terminal 2: 사용자 B (동시 실행)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: session-user-b-$(date +%s)" \
  -d '{
    "jsonrpc": "2.0", 
    "id": 2,
    "method": "tools/list",
    "params": {}
  }' \
  --url-query "key=mcphub_user_b_key_here"
```

#### **예상 결과**
- 각 사용자가 자신의 그룹에 해당하는 도구만 받음
- 로그에서 사용자별 컨텍스트 구분 확인:
  ```
  👤 사용자 인증 성공: user-a (uuid-a)
  🔄 업스트림 컨텍스트 생성: user-a | session-uuid-a... | request-uuid-a...
  🔄 업스트림 헤더 추가 (github-mcp): 8개
  ```

### **시나리오 2: 사용자별 토큰 격리**

#### **테스트 설정**
```bash
# 사용자 A: GitHub 토큰 A 설정
# 사용자 B: GitHub 토큰 B 설정
```

#### **테스트 명령어**
```bash
# 사용자 A: GitHub 도구 호출
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: session-a-github" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "github-get-user",
      "arguments": {}
    }
  }' \
  --url-query "key=mcphub_user_a_key"

# 사용자 B: 동일한 GitHub 도구 호출
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: session-b-github" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2, 
    "method": "tools/call",
    "params": {
      "name": "github-get-user",
      "arguments": {}
    }
  }' \
  --url-query "key=mcphub_user_b_key"
```

#### **예상 결과**
- 각 사용자가 자신의 GitHub 정보만 받음
- 업스트림 GitHub MCP 서버에서 올바른 토큰 사용 확인

### **시나리오 3: 상태 기반 서버 격리**

#### **Test MCP 서버 설정**
```javascript
// test-mcp-server.js
const server = new Server({
  name: "test-state-server",
  version: "1.0.0"
}, {
  capabilities: { tools: {} }
});

let userContexts = {}; // 사용자별 상태 저장

server.setRequestHandler(SetContextRequestSchema, async (request, context) => {
  const userId = context.meta?.headers?.['X-MCPHub-User-Id'];
  const userSessionId = context.meta?.headers?.['X-MCPHub-User-Session-Id'];
  
  if (userId) {
    userContexts[userId] = request.params.context;
    console.log(`상태 설정: ${userId} -> ${JSON.stringify(request.params.context)}`);
  }
  
  return { success: true };
});

server.setRequestHandler(GetDataRequestSchema, async (request, context) => {
  const userId = context.meta?.headers?.['X-MCPHub-User-Id'];
  
  if (userId && userContexts[userId]) {
    return { data: userContexts[userId] };
  }
  
  return { data: null };
});
```

#### **테스트 명령어**
```bash
# 사용자 A: 컨텍스트 설정
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: session-a-state" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call", 
    "params": {
      "name": "set-context",
      "arguments": {"project": "project-a", "env": "production"}
    }
  }' \
  --url-query "key=mcphub_user_a_key"

# 사용자 B: 다른 컨텍스트 설정
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: session-b-state" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "set-context", 
      "arguments": {"project": "project-b", "env": "development"}
    }
  }' \
  --url-query "key=mcphub_user_b_key"

# 사용자 A: 데이터 조회 
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: session-a-state" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "get-data",
      "arguments": {}
    }
  }' \
  --url-query "key=mcphub_user_a_key"
```

#### **예상 결과**
- 사용자 A는 project-a 데이터만 받음
- 사용자 B는 project-b 데이터만 받음
- 상호 상태 간섭 없음

---

## 🔍 **로그 분석 가이드**

### **정상 격리 로그 패턴**

```
📋 ListToolsRequest 처리 시작 (세션: 12345678..., 그룹: global)
👤 사용자 인증 성공: user-a (uuid-a)
🔄 업스트림 컨텍스트 생성: user-a | session-uuid-a... | request-uuid-a... | 서버: github-mcp | 토큰: 3개 | 그룹: 2개
📋 요청 추적 시작: user-a-12345678-tools/list-1690123456-abc123 (사용자: user-a, 메서드: tools/list)
🔄 업스트림 헤더 추가 (github-mcp): 8개
🔐 업스트림 토큰 헤더 생성 (github-mcp): 3개
✅ 요청 완료: user-a-12345678-tools/list-1690123456-abc123 (응답시간: 234ms)
```

### **문제 상황 로그 패턴**

```
⚠️ 알 수 없는 요청 ID: request-xyz
❌ 요청 실패: user-a-request-123, 에러: Connection timeout  
❌ MCPHub Key에서 사용자 정보 추출 실패: Invalid key format
```

### **모니터링 명령어**

```bash
# 실시간 로그 모니터링
tail -f logs/mcphub.log | grep -E "(👤|🔄|📋|✅|❌)"

# 사용자별 요청 통계 확인
curl http://localhost:3000/api/admin/session-stats

# 업스트림 연결 상태 확인
curl http://localhost:3000/api/admin/upstream-status
```

---

## ⚠️ **주의사항**

### **테스트 전 확인사항**
1. MCPHub 서버 정상 실행 중
2. 업스트림 MCP 서버들 실행 중
3. 사용자별 MCPHub Key 설정 완료
4. 각 사용자의 서비스 토큰 설정 완료

### **테스트 실패 시 확인사항**
1. 세션 ID가 올바르게 전달되는지
2. MCPHub Key 인증이 성공하는지
3. 업스트림 서버가 응답하는지
4. 헤더가 올바르게 전파되는지

### **성능 고려사항**
- 동시 요청 수: 10개 이하 권장 (테스트 환경)
- 요청 간격: 1초 이상 권장
- 타임아웃: 30초 설정됨

---

## 🎯 **성공 기준**

### **P0 (필수)**
- [ ] 동시 다중 사용자 요청 시 응답 혼재 없음
- [ ] 사용자별 토큰이 올바른 업스트림으로 전달됨
- [ ] 요청 추적 로그에서 사용자 구분 가능

### **P1 (중요)**
- [ ] 상태 기반 서버에서 사용자별 상태 격리
- [ ] 에러 발생 시 다른 사용자에게 영향 없음
- [ ] 세션 종료 시 리소스 정리 정상

### **P2 (권장)**
- [ ] 응답 시간 30초 이내
- [ ] 메모리 사용량 증가율 10% 이내
- [ ] 동시 연결 수 제한 동작

---

**이 가이드를 통해 MCPHub의 세션 격리 기능이 올바르게 작동하는지 검증할 수 있습니다.**