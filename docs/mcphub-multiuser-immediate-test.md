# MCPHub 다중 사용자 즉시 테스트 가이드

## 🎯 현재 시스템으로 즉시 테스트 가능한 방법

### 1️⃣ **이미 작동하는 서버들 확인**

#### **완벽하게 작동하는 Remote MCP 서버들**
- ✅ **GitHub PR MCP (ACA)**: `${USER_GITHUB_TOKEN}` 사용
- ✅ **jira-azure**: `${USER_JIRA_API_TOKEN}` 등 사용
- ✅ **mcp-atlassian**: `${USER_ATLASSIAN_TOKEN}` 등 사용

### 2️⃣ **실제 테스트 시나리오**

#### **준비 작업**
1. **두 명의 사용자 계정 준비**:
   - 사용자 A: GitHub 개인 계정
   - 사용자 B: GitHub 회사 계정 (또는 다른 개인 계정)

2. **각각 MCPHub에 로그인하여 다른 GitHub 토큰 설정**:
   - 사용자 A: 개인 GitHub 토큰 설정
   - 사용자 B: 회사 GitHub 토큰 설정

#### **동시 테스트**
```bash
# Terminal 1: 사용자 A
curl -X POST "http://localhost:3000/mcp?key=USER_A_MCPHUB_KEY" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: session-a-$(date +%s)" \
  -d '{
    "jsonrpc": "2.0", 
    "id": 1, 
    "method": "tools/call", 
    "params": {
      "name": "GitHub PR MCP (ACA)-list_repositories"
    }
  }'

# Terminal 2: 사용자 B (동시 실행)
curl -X POST "http://localhost:3000/mcp?key=USER_B_MCPHUB_KEY" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: session-b-$(date +%s)" \
  -d '{
    "jsonrpc": "2.0", 
    "id": 2, 
    "method": "tools/call", 
    "params": {
      "name": "GitHub PR MCP (ACA)-list_repositories"
    }
  }'
```

#### **예상 결과**
- **사용자 A**: 개인 GitHub 계정의 저장소 목록
- **사용자 B**: 회사 GitHub 계정의 저장소 목록
- **✅ 서로 다른 결과가 나오면 격리 성공!**

### 3️⃣ **로그로 확인하기**

#### **MCPHub 서버 로그 확인**
```bash
# MCPHub 서버 로그에서 다음과 같은 내용 확인
2025-08-01 15:30:15 [info] 👤 사용자 인증 성공: user-a-github-username (user-a-uuid)
2025-08-01 15:30:15 [info] 🔄 업스트림 헤더 추가 (GitHub PR MCP (ACA)): 3개
2025-08-01 15:30:16 [info] 👤 사용자 인증 성공: user-b-github-username (user-b-uuid)  
2025-08-01 15:30:16 [info] 🔄 업스트림 헤더 추가 (GitHub PR MCP (ACA)): 3개
```

#### **업스트림 헤더 확인**
로그에서 다음과 같은 헤더가 전달되는지 확인:
```typescript
// 사용자 A 요청
{
  'X-MCPHub-User-Id': 'user-a-uuid',
  'X-MCPHub-GitHub-Token': 'ghp_user_a_token_xxx',
  'Authorization': 'Bearer ghp_user_a_token_xxx'
}

// 사용자 B 요청  
{
  'X-MCPHub-User-Id': 'user-b-uuid',
  'X-MCPHub-GitHub-Token': 'ghp_user_b_token_yyy', 
  'Authorization': 'Bearer ghp_user_b_token_yyy'
}
```