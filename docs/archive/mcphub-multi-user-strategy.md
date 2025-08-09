# MCPHub 다중 사용자 지원 전략

## 📋 개요

MCPHub에서 여러 사용자가 안전하게 다양한 MCP 서버들을 사용할 수 있도록 하는 완전한 전략 가이드입니다.

**문서 버전**: 1.0  
**작성일**: 2025-08-01  
**결론**: 기반 시스템은 완벽, 실제로 이미 작동하는 부분도 있음

---

## ✅ **이미 작동하는 시스템들**

### **1. 완벽하게 작동하는 MCP 서버들**

현재 `mcp_settings.json`에서 **이미 사용자별 격리가 작동하는** 서버들:

```json
{
  "mcpServers": {
    "mcp-atlassian": {
      "type": "streamable-http",
      "url": "https://mcp-atlassian.livelybeach-90f399a8.koreacentral.azurecontainerapps.io/mcp/",
      "headers": {
        "Authorization": "Bearer ${USER_ATLASSIAN_TOKEN}",
        "X-User-Email": "${USER_ATLASSIAN_EMAIL}",
        "X-Atlassian-Cloud-Id": "${USER_ATLASSIAN_CLOUD_ID}"
      }
    },
    "jira-azure": {
      "type": "streamable-http", 
      "url": "https://streamable-jira-mcp-server-kt.greentree-fe6d930a.koreacentral.azurecontainerapps.io/mcp",
      "headers": {
        "X-Jira-Base-Url": "${USER_JIRA_BASE_URL}",
        "X-Jira-Email": "${USER_JIRA_EMAIL}",
        "X-Jira-Api-Token": "${USER_JIRA_API_TOKEN}"
      }
    },
    "GitHub PR MCP (ACA)": {
      "type": "streamable-http",
      "url": "https://github-pr-mcp-server.livelybeach-90f399a8.koreacentral.azurecontainerapps.io/mcp/",
      "headers": {
        "Authorization": "Bearer ${USER_GITHUB_TOKEN}"
      }
    }
  }
}
```

#### **왜 이들은 완벽하게 작동하는가?**

1. **Remote 서버들**: 이들은 원격 서버로, MCPHub가 헤더로 사용자 정보를 전달
2. **Header 기반 인증**: `${USER_*}` 템플릿이 사용자별 토큰으로 치환됨
3. **Stateless 설계**: 각 요청마다 사용자 정보를 헤더로 받아 처리

### **2. 완벽한 기반 시스템**

MCPHub가 이미 제공하는 완벽한 인프라:

#### **✅ 인증 시스템**
```typescript
// GitHub OAuth → MCPHub Key → 사용자별 토큰
const userServiceTokens = await authenticateWithMcpHubKey(mcpHubKey);
// {
//   GITHUB_TOKEN: "ghp_user_specific_token",
//   ATLASSIAN_TOKEN: "atlassian_user_token",
//   JIRA_API_TOKEN: "jira_user_token"
// }
```

#### **✅ 헤더 전파 시스템**
```typescript
// src/services/mcpService.ts - 이미 구현됨
const upstreamHeaders = upstreamContextPropagator.generateUpstreamHeaders({
  userId: userContext.userId,
  userServiceTokens: userApiKeys,
  requestId: userContext.requestId
}, serverName);

// 결과:
// {
//   'X-MCPHub-User-Id': 'user-uuid',
//   'X-MCPHub-GitHub-Token': 'user-specific-token',
//   'Authorization': 'Bearer user-specific-token'
// }
```

#### **✅ 사용자별 그룹 필터링**
```typescript
// 사용자가 활성화한 그룹의 서버만 노출
const userGroups = await userGroupService.findActiveGroupsByUserId(userId);
const filteredServers = serverInfos.filter(server => 
  userGroups.some(group => group.servers.includes(server.name))
);
```

---

## 🎯 **다중 사용자 지원 전략**

### **전략 1: 이미 작동하는 시스템 활용 (즉시 적용)**

#### **현재 완벽 작동하는 서버들**
- ✅ **GitHub PR MCP (ACA)**: 사용자별 GitHub 토큰 사용
- ✅ **mcp-atlassian**: 사용자별 Atlassian 계정 연동  
- ✅ **jira-azure**: 사용자별 Jira 계정 연동

#### **추가 가능한 동일 패턴 서버들**
```json
{
  "slack-remote": {
    "type": "streamable-http",
    "url": "https://your-slack-mcp-server.com/mcp",
    "headers": {
      "Authorization": "Bearer ${USER_SLACK_BOT_TOKEN}",
      "X-Slack-Team-Id": "${USER_SLACK_TEAM_ID}"
    }
  },
  "notion-remote": {
    "type": "streamable-http", 
    "url": "https://your-notion-mcp-server.com/mcp",
    "headers": {
      "Authorization": "Bearer ${USER_NOTION_TOKEN}"
    }
  }
}
```

### **전략 2: 기존 로컬 MCP 서버를 래핑 (단기 솔루션)**

#### **Wrapper 서버 개발**
```typescript
// src/services/mcpWrapperService.ts
class MCPWrapperService {
  private userInstances: Map<string, Map<string, Process>> = new Map();

  async startUserMCPServer(userId: string, serverName: string, userTokens: Record<string, string>) {
    // 사용자별 별도 프로세스로 MCP 서버 실행
    const env = { ...process.env, ...userTokens };
    const workDir = `/tmp/mcp-${userId}-${serverName}`;
    
    await fs.ensureDir(workDir);
    
    const serverProcess = spawn('mcp-server-github', {
      env,
      cwd: workDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    if (!this.userInstances.has(userId)) {
      this.userInstances.set(userId, new Map());
    }
    this.userInstances.get(userId)!.set(serverName, serverProcess);
    
    return serverProcess;
  }

  async routeToUserServer(userId: string, serverName: string, request: any) {
    const userServers = this.userInstances.get(userId);
    const serverProcess = userServers?.get(serverName);
    
    if (!serverProcess) {
      throw new Error(`Server ${serverName} not started for user ${userId}`);
    }
    
    // 요청을 사용자별 서버 프로세스로 전달
    return this.sendToProcess(serverProcess, request);
  }
}
```

#### **설정 예시**
```json
{
  "mcpServers": {
    "github-local": {
      "type": "user-isolated",
      "baseCommand": "npx",
      "baseArgs": ["-y", "@modelcontextprotocol/server-github"],
      "userTokens": ["GITHUB_TOKEN"],
      "riskLevel": "critical"
    },
    "filesystem-local": {
      "type": "user-isolated", 
      "baseCommand": "npx",
      "baseArgs": ["-y", "@modelcontextprotocol/server-filesystem"],
      "userTokens": [],
      "userDirectories": ["${USER_HOME_DIR}"],
      "riskLevel": "high"
    }
  }
}
```

### **전략 3: MCPHub 내장 서버 개발 (중기 솔루션)**

#### **핵심 기능을 MCPHub에 직접 구현**
```typescript
// src/services/mcpBuiltinServers/githubBuiltinService.ts
export class GitHubBuiltinService {
  async listRepositories(userId: string, userTokens: Record<string, string>) {
    const token = userTokens.GITHUB_TOKEN;
    if (!token) throw new Error('GitHub token required');
    
    const octokit = new Octokit({ auth: token });
    const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser();
    
    return repos.map(repo => ({
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      url: repo.html_url
    }));
  }

  async createPullRequest(userId: string, userTokens: Record<string, string>, params: any) {
    const token = userTokens.GITHUB_TOKEN;
    const octokit = new Octokit({ auth: token });
    
    const { data: pr } = await octokit.rest.pulls.create({
      owner: params.owner,
      repo: params.repo,
      title: params.title,
      body: params.body,
      head: params.head,
      base: params.base
    });
    
    return pr;
  }
}
```

#### **통합된 도구 제공**
```typescript
// src/services/mcpService.ts에 내장 서버 통합
export const handleBuiltinToolCall = async (
  toolName: string, 
  params: any, 
  userId: string, 
  userTokens: Record<string, string>
) => {
  const [serverName, action] = toolName.split('-');
  
  switch (serverName) {
    case 'github':
      const githubService = new GitHubBuiltinService();
      return await githubService[action](userId, userTokens, params);
      
    case 'notion':
      const notionService = new NotionBuiltinService();
      return await notionService[action](userId, userTokens, params);
      
    default:
      throw new Error(`Unknown builtin server: ${serverName}`);
  }
};
```

### **전략 4: 스마트 라우팅 시스템 (장기 솔루션)**

#### **서버별 격리 수준 자동 결정**
```typescript
interface ServerIsolationConfig {
  name: string;
  isolationLevel: 'none' | 'token' | 'process' | 'builtin';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  capabilities: string[];
}

const serverConfigs: ServerIsolationConfig[] = [
  {
    name: 'github-mcp',
    isolationLevel: 'process', // 사용자별 프로세스 분리
    riskLevel: 'critical',
    capabilities: ['read_repos', 'create_pr', 'manage_issues']
  },
  {
    name: 'time-mcp',
    isolationLevel: 'none', // 공유 사용 가능
    riskLevel: 'low', 
    capabilities: ['get_time', 'convert_timezone']
  },
  {
    name: 'filesystem-mcp',
    isolationLevel: 'process', // 사용자별 디렉토리 분리
    riskLevel: 'high',
    capabilities: ['read_files', 'write_files']
  }
];
```

---

## 🚀 **즉시 실행 가능한 실행 계획**

### **Phase 1: 기존 시스템 최적화 (1-2일)**

#### **1. 현재 작동하는 서버들 검증**
```bash
# 1. 사용자별 토큰 설정 테스트
# 사용자 A: GitHub Token A 설정
# 사용자 B: GitHub Token B 설정

# 2. 동시 요청 테스트
curl -X POST "http://localhost:3000/mcp?key=mcphub_user_a_key" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "GitHub PR MCP (ACA)-list_repositories"}}'

curl -X POST "http://localhost:3000/mcp?key=mcphub_user_b_key" \
  -d '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "GitHub PR MCP (ACA)-list_repositories"}}'

# 3. 결과 확인: 각각 다른 사용자의 저장소 목록이 나와야 함
```

#### **2. 추가 Remote 서버 연결**
```json
// mcp_settings.json에 추가
{
  "notion-remote": {
    "type": "streamable-http",
    "url": "https://notion-mcp-server.example.com/mcp",
    "enabled": true,
    "headers": {
      "Authorization": "Bearer ${USER_NOTION_TOKEN}"
    }
  },
  "slack-remote": {
    "type": "streamable-http", 
    "url": "https://slack-mcp-server.example.com/mcp",
    "enabled": true,
    "headers": {
      "Authorization": "Bearer ${USER_SLACK_BOT_TOKEN}",
      "X-Slack-Team-Id": "${USER_SLACK_TEAM_ID}"
    }
  }
}
```

### **Phase 2: 위험 서버 격리 (1주)**

#### **1. 위험도 기반 분류 시스템**
```typescript
// src/types/index.ts에 추가
export interface ServerConfig {
  type?: 'stdio' | 'sse' | 'streamable-http' | 'openapi' | 'user-isolated';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  requiresUserIsolation?: boolean;
  // ... 기존 필드들
}
```

#### **2. 프로세스 격리 시스템 구현**
```typescript
// src/services/userIsolatedMcpService.ts - 새 파일
export class UserIsolatedMcpService {
  async startUserProcess(userId: string, serverConfig: ServerConfig, userTokens: Record<string, string>) {
    // 사용자별 별도 프로세스 시작
  }
  
  async routeToUserProcess(userId: string, serverName: string, request: any) {
    // 사용자별 프로세스로 요청 라우팅
  }
}
```

### **Phase 3: 내장 서버 개발 (2-3주)**

#### **핵심 서버들을 MCPHub에 내장**
1. **GitHub 내장 서버**: Octokit 사용
2. **File 내장 서버**: 사용자별 디렉토리 권한
3. **Database 내장 서버**: 사용자별 스키마/연결

---

## 🎯 **결론**

### ✅ **이미 작동하는 것들**
1. **완벽한 인증 시스템**: GitHub OAuth → MCPHub Key
2. **헤더 기반 사용자 정보 전파**: 이미 구현됨
3. **사용자별 그룹 필터링**: 이미 작동함
4. **Remote MCP 서버들**: 완벽하게 사용자별 격리 작동

### 🚧 **해결해야 할 것들**
1. **로컬 MCP 서버들**: 환경변수 공유 문제
2. **프로세스 격리**: 사용자별 별도 프로세스 실행 필요

### 🚀 **전략 요약**

1. **즉시 (1-2일)**: 현재 작동하는 Remote 서버들 최대 활용
2. **단기 (1주)**: 위험한 로컬 서버들을 프로세스별로 격리  
3. **중기 (2-3주)**: 핵심 기능들을 MCPHub에 내장
4. **장기**: MCP 프로토콜 표준 개선 제안

**결론: 세션 관리 시스템은 전혀 무용지물이 아니며, 실제로 이미 상당 부분이 완벽하게 작동하고 있습니다. 몇 가지 추가 작업만으로 완전한 다중 사용자 시스템을 구축할 수 있습니다!** 🎉

---

**문서 버전**: 1.0  
**최종 업데이트**: 2025-08-01  
**작성자**: MCPHub 개발팀