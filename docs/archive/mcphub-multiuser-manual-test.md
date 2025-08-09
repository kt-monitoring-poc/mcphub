# MCPHub 다중 사용자 수동 테스트 가이드

## 🎯 목표
`mcp-atlassian`과 `github-pr-mcp-server` 두 서버를 사용하여 실제로 사용자별 격리가 작동하는지 확인

## 📋 준비 작업

### 1단계: 두 명의 테스트 사용자 준비
- **사용자 A**: 개인 GitHub 계정 + 개인/회사 Atlassian 계정
- **사용자 B**: 다른 GitHub 계정 + 다른 Atlassian 계정

### 2단계: 각 사용자별 MCPHub 설정

#### **사용자 A 설정**
1. MCPHub에 GitHub OAuth로 로그인
2. "키 관리" 페이지에서 MCPHub Key 생성/복사
3. "API Keys" 페이지에서 다음 설정:
   ```
   GITHUB_TOKEN=ghp_userA_personal_token
   ATLASSIAN_TOKEN=atlassian_userA_token  
   ATLASSIAN_EMAIL=userA@example.com
   ATLASSIAN_CLOUD_ID=userA_cloud_id
   ```

#### **사용자 B 설정**
1. MCPHub에 다른 GitHub 계정으로 로그인
2. "키 관리" 페이지에서 MCPHub Key 생성/복사  
3. "API Keys" 페이지에서 다른 토큰 설정:
   ```
   GITHUB_TOKEN=ghp_userB_company_token
   ATLASSIAN_TOKEN=atlassian_userB_token
   ATLASSIAN_EMAIL=userB@company.com
   ATLASSIAN_CLOUD_ID=userB_cloud_id
   ```

## 🧪 테스트 실행

### 테스트 1: Tools List 확인

#### **사용자 A**
```bash
curl -X POST "http://localhost:3000/mcp?key=USER_A_MCPHUB_KEY" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: session-a-$(date +%s)" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }' | jq '.result.tools[] | select(.name | contains("github") or contains("atlassian")) | .name'
```

#### **사용자 B (다른 터미널)**
```bash
curl -X POST "http://localhost:3000/mcp?key=USER_B_MCPHUB_KEY" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: session-b-$(date +%s)" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2, 
    "method": "tools/list"
  }' | jq '.result.tools[] | select(.name | contains("github") or contains("atlassian")) | .name'
```

**예상 결과**: 두 사용자 모두 동일한 도구 목록 (도구 목록은 공통이지만, 실행 시 다른 토큰 사용)

### 테스트 2: GitHub 저장소 목록 비교

#### **사용자 A**
```bash
curl -X POST "http://localhost:3000/mcp?key=USER_A_MCPHUB_KEY" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: session-a-$(date +%s)" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "github-pr-mcp-server-list_repositories",
      "arguments": {}
    }
  }' | jq '.result.content[0].text'
```

#### **사용자 B**
```bash
curl -X POST "http://localhost:3000/mcp?key=USER_B_MCPHUB_KEY" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: session-b-$(date +%s)" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call", 
    "params": {
      "name": "github-pr-mcp-server-list_repositories",
      "arguments": {}
    }
  }' | jq '.result.content[0].text'
```

**예상 결과**: 
- 사용자 A → 개인 GitHub 계정의 저장소 목록
- 사용자 B → 회사 GitHub 계정의 저장소 목록
- **✅ 서로 다른 결과가 나오면 격리 성공!**

### 테스트 3: Atlassian 프로젝트 목록 비교

#### **사용자 A**
```bash
curl -X POST "http://localhost:3000/mcp?key=USER_A_MCPHUB_KEY" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: session-a-$(date +%s)" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "mcp-atlassian-list_projects",
      "arguments": {}
    }
  }' | jq '.result.content[0].text'
```

#### **사용자 B**
```bash
curl -X POST "http://localhost:3000/mcp?key=USER_B_MCPHUB_KEY" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: session-b-$(date +%s)" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "mcp-atlassian-list_projects", 
      "arguments": {}
    }
  }' | jq '.result.content[0].text'
```

**예상 결과**:
- 사용자 A → 개인 Atlassian 워크스페이스의 프로젝트
- 사용자 B → 회사 Atlassian 워크스페이스의 프로젝트  
- **✅ 서로 다른 결과가 나오면 격리 성공!**

### 테스트 4: 동시 요청 테스트

두 터미널에서 **정확히 같은 시간에** 같은 명령어 실행:

```bash
# 터미널 1 (사용자 A)
curl -X POST "http://localhost:3000/mcp?key=USER_A_MCPHUB_KEY" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: session-a-concurrent" \
  -d '{
    "jsonrpc": "2.0",
    "id": 7,
    "method": "tools/call",
    "params": {
      "name": "github-pr-mcp-server-list_repositories",
      "arguments": {}
    }
  }'

# 터미널 2 (사용자 B) - 동시 실행
curl -X POST "http://localhost:3000/mcp?key=USER_B_MCPHUB_KEY" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: session-b-concurrent" \
  -d '{
    "jsonrpc": "2.0", 
    "id": 8,
    "method": "tools/call",
    "params": {
      "name": "github-pr-mcp-server-list_repositories",
      "arguments": {}
    }
  }'
```

**예상 결과**: 동시 실행에도 각각 올바른 사용자의 데이터 반환

## 📊 MCPHub 서버 로그 확인

테스트 실행 중 MCPHub 서버 로그에서 다음 내용 확인:

```bash
# MCPHub 서버 로그 모니터링
tail -f logs/mcphub.log | grep -E "(사용자 인증|업스트림 헤더|User-Id|GitHub-Token)"
```

**확인할 로그 예시**:
```
2025-08-01 16:30:15 [info] 👤 사용자 인증 성공: user-a-github-username (uuid-a)
2025-08-01 16:30:15 [info] 🔄 업스트림 헤더 추가 (github-pr-mcp-server): 3개
2025-08-01 16:30:16 [info] 👤 사용자 인증 성공: user-b-github-username (uuid-b)  
2025-08-01 16:30:16 [info] 🔄 업스트림 헤더 추가 (github-pr-mcp-server): 3개
```

## ✅ 성공 기준

### **격리 성공 지표**
1. **서로 다른 데이터**: 각 사용자가 자신의 계정 데이터만 받음
2. **동시 요청 안정성**: 동시 실행 시에도 혼재 없음  
3. **로그 분리**: 서버 로그에서 사용자별로 다른 ID/토큰 확인
4. **에러 없음**: 모든 요청이 성공적으로 처리됨

### **격리 실패 지표** 
1. **동일한 데이터**: 두 사용자가 같은 결과 받음
2. **토큰 에러**: 잘못된 토큰으로 인한 인증 실패
3. **요청 혼재**: 사용자 A 요청에 사용자 B 데이터 반환

## 🔧 문제 해결

### **일반적인 문제들**

#### **1. "Invalid user key" 에러**
- MCPHub Key가 올바른지 확인
- 키 만료 여부 확인

#### **2. "GitHub token invalid" 에러**  
- API Keys 페이지에서 토큰 설정 확인
- GitHub 토큰 권한 확인

#### **3. "Connection refused" 에러**
- MCPHub 서버가 실행 중인지 확인
- 포트 3000이 사용 가능한지 확인

#### **4. 동일한 결과 반환**
- 각 사용자가 서로 다른 토큰을 설정했는지 확인
- 서버 로그에서 실제 전달되는 토큰 확인

## 🎯 테스트 완료 후

성공적으로 격리가 확인되면:

1. **문서 업데이트**: 성공한 테스트 결과를 문서에 기록
2. **추가 서버 연결**: 다른 Remote MCP 서버들도 동일한 패턴으로 연결
3. **로컬 서버 격리**: 필요시 로컬 MCP 서버들에 대한 프로세스 격리 구현

**MCPHub의 다중 사용자 격리 시스템이 실제로 작동함을 증명하는 중요한 테스트입니다!** 🚀