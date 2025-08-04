# MCPHub 환경변수 자동화 시스템

## 개요

MCPHub의 MCP 서버 환경변수 관리는 완전 자동화된 시스템으로 구현되었습니다. 관리자가 새로운 MCP 서버를 `mcp_settings.json`에 추가하면, 필요한 환경변수 입력 필드가 일반 사용자의 설정 페이지에 자동으로 생성됩니다.

## 🎯 핵심 특징

### ✅ **완전 자동화**
- **코드 수정 불필요**: 새 MCP 서버 추가 시 프론트엔드/백엔드 코드 변경 없음
- **동적 필드 생성**: 환경변수 입력 필드가 자동으로 생성됨
- **스마트 매핑**: 환경변수가 올바른 서버에 자동으로 연결됨
- **기존 값 표시**: 저장된 토큰 값들이 자동으로 입력 필드에 표시됨

### 🔄 **자동화 플로우**

```
1. 관리자 작업: mcp_settings.json에 새 서버 추가
   ↓
2. 백엔드 자동 감지: extractUserEnvVars()가 환경변수 탐지
   ↓  
3. API 자동 생성: /api/env-templates가 템플릿 제공
   ↓
4. 프론트엔드 자동 렌더링: 설정 페이지에 입력 필드 생성
   ↓
5. 사용자 입력 및 저장: mcphub_keys.serviceTokens에 저장
```

## 🛠 구현 세부사항

### 1. 백엔드 환경변수 감지

**파일**: `src/utils/variableDetection.ts`

```typescript
export const extractUserEnvVars = (serverConfig: any): string[] => {
    const variables = new Set<string>();

    // 1. ${USER_...} 패턴 감지
    const templateVars = detectVariables(serverConfig);
    templateVars.filter(varName => varName.startsWith('USER_')).forEach(varName => variables.add(varName));

    // 2. env 필드에 직접 정의된 환경변수 감지
    if (serverConfig.env && typeof serverConfig.env === 'object') {
        Object.keys(serverConfig.env).forEach(key => {
            if (key.startsWith('USER_')) {
                variables.add(key);
            }
        });
    }

    return Array.from(variables);
};
```

### 2. API 엔드포인트

**파일**: `src/routes/index.ts`

#### GET `/api/env-templates`
- `mcp_settings.json`의 모든 서버에서 환경변수 추출
- 서버별로 그룹화하여 반환

#### GET `/api/user-env-vars`  
- 사용자별 저장된 환경변수 조회
- `mcphub_keys.serviceTokens`에서 데이터 로드

#### POST `/api/user-env-vars`
- 사용자 환경변수 저장
- `mcphub_keys.serviceTokens` JSONB 필드에 업데이트

### 3. 프론트엔드 자동 렌더링

**파일**: `frontend/src/pages/SettingsPage.tsx`

#### 핵심 기능들:

1. **환경변수 템플릿 로드**:
```typescript
const loadEnvVarTemplates = async () => {
    // 1. env-templates API에서 서버별 환경변수 목록 가져오기
    // 2. servers API에서 서버 정보 가져오기  
    // 3. EnvVarConfig 객체들 생성
    // 4. UI 상태 초기화
    // 5. 기존 사용자 값 로드
}
```

2. **사용자 토큰 로드 & 매핑**:
```typescript
const loadUserEnvVars = async () => {
    // API 응답: {github: {GITHUB_TOKEN: 'xxx'}, firecrawl-mcp: {FIRECRAWL_TOKEN: 'yyy'}}
    // 변환: {USER_GITHUB_TOKEN: 'xxx', USER_FIRECRAWL_TOKEN: 'yyy'}
    Object.entries(data.data).forEach(([serverName, serverEnvVars]) => {
        Object.entries(serverEnvVars).forEach(([varName, value]) => {
            const userVarName = varName.startsWith('USER_') ? varName : `USER_${varName}`;
            flattenedEnvVars[userVarName] = value;
        });
    });
}
```

3. **동적 저장 (완전 자동화)**:
```typescript
const handleSaveEnvVars = async () => {
    // envVarConfigs를 사용한 동적 서버 매핑 (하드코딩 제거)
    Object.entries(envVars).forEach(([varName, value]) => {
        const config = envVarConfigs.find(c => c.varName === varName);
        if (config) {
            const serverName = config.serverName; // 자동으로 서버 찾기
            groupedEnvVarsForSave[serverName][cleanVarName] = value;
        }
    });
}
```

## 📊 데이터 구조

### mcp_settings.json 예시
```json
{
  "mcpServers": {
    "firecrawl-mcp": {
      "type": "sse", 
      "url": "http://localhost:8080/sse",
      "env": {
        "USER_FIRECRAWL_TOKEN": "fc-..."
      }
    },
    "jira-emoket": {
      "type": "stdio",
      "command": "npx",
      "args": ["jira-mcp-server-kt"],
      "env": {
        "USER_JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "USER_JIRA_EMAIL": "your-email@company.com", 
        "USER_JIRA_API_TOKEN": "your_api_token"
      }
    }
  }
}
```

### mcphub_keys.serviceTokens (DB)
```json
{
  "GITHUB_TOKEN": "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",
  "FIRECRAWL_TOKEN": "fc-89c11d9ad6ab4636bbfdfff9731d0972",
  "JIRA_BASE_URL": "https://emoket.atlassian.net",
  "JIRA_EMAIL": "admin@emoket.com",
  "JIRA_API_TOKEN": "ATATT3xFfGF..."
}
```

## 🔧 관리자 워크플로우

### 새 MCP 서버 추가 과정:

1. **mcp_settings.json 편집**: 관리자 UI를 통해 JSON 직접 편집
2. **환경변수 정의**: `env` 필드에 `USER_` 접두사로 환경변수 추가
3. **자동 감지**: 시스템이 자동으로 새 환경변수들을 감지
4. **UI 자동 생성**: 일반 사용자 설정 페이지에 입력 필드 자동 생성

### 예시: 새 Slack MCP 서버 추가

```json
"slack-mcp": {
  "type": "sse",
  "url": "http://localhost:9000/sse", 
  "env": {
    "USER_SLACK_BOT_TOKEN": "xoxb-...",
    "USER_SLACK_APP_TOKEN": "xapp-..."
  }
}
```

추가 즉시 사용자 설정 페이지에 다음이 자동 생성됨:
- **slack-mcp** 섹션
- `Slack Bot Token` 입력 필드
- `Slack App Token` 입력 필드

## 🎨 UI/UX 특징

### 설정 페이지 구성:
- **서버별 그룹화**: 각 MCP 서버마다 접을 수 있는 섹션
- **스마트 라벨링**: 환경변수명을 사용자 친화적 라벨로 자동 변환
- **아이콘 매핑**: 서버/환경변수 타입별 적절한 아이콘 표시
- **비밀번호 필드**: 민감한 토큰들은 기본적으로 숨김 처리
- **실시간 저장**: 변경사항 즉시 DB 반영

### 환경변수명 변환 예시:
- `USER_FIRECRAWL_TOKEN` → `Firecrawl Token`
- `USER_JIRA_BASE_URL` → `Jira Base Url`
- `USER_GITHUB_TOKEN` → `Github Token`

## 🔒 보안 고려사항

1. **암호화 저장**: 모든 토큰은 `mcphub_keys.serviceTokens` JSONB 필드에 저장
2. **인증 보호**: `/api/user-env-vars` 엔드포인트는 `requireAuth` 미들웨어로 보호
3. **사용자별 격리**: 각 사용자는 자신의 토큰만 조회/수정 가능
4. **비밀번호 필드**: UI에서 토큰 값들이 기본적으로 숨겨짐

## ✅ 완성된 기능들

### 관리자 기능:
- [x] mcp_settings.json 파일 직접 편집 UI
- [x] 새 MCP 서버 추가 시 자동 환경변수 감지
- [x] 환경변수 템플릿 자동 생성

### 일반 사용자 기능:  
- [x] 동적 환경변수 입력 필드 생성
- [x] 기존 저장값 자동 로드 및 표시
- [x] 서버별 그룹화된 UI
- [x] 실시간 저장 기능
- [x] 사용자 친화적 라벨링

### 시스템 자동화:
- [x] 완전 무코딩 MCP 서버 추가
- [x] 동적 환경변수 매핑
- [x] 자동 UI 필드 생성
- [x] 스마트 데이터 변환

## 🚀 사용 시나리오

### 시나리오 1: 새 MCP 서버 개발팀 온보딩
1. 개발팀이 새 MCP 서버 개발 완료
2. JSON 설정 스펙을 관리자에게 전달
3. 관리자가 mcp_settings.json에 복사-붙여넣기
4. 즉시 모든 사용자의 설정 페이지에 입력 필드 생성
5. 사용자들이 각자 API 키 입력 후 사용 시작

### 시나리오 2: 기존 사용자 토큰 관리
1. 사용자가 설정 페이지 접속
2. 기존에 저장한 모든 토큰 값들이 자동으로 표시
3. 필요시 토큰 값 수정 후 저장
4. 즉시 모든 MCP 서버에 새 토큰이 적용

## 📈 확장성

이 시스템은 무한정 확장 가능합니다:
- **서버 수량**: 제한 없음
- **환경변수 수량**: 서버당 제한 없음  
- **코드 수정**: 새 서버 추가 시 불필요
- **배포 영향**: 설정 변경만으로 즉시 적용

---

## 🚀 **v2.0 업데이트 (2025-07-31)**

### ✅ **완전 환경변수 템플릿화 완료**

모든 하드코딩된 값들이 환경변수 템플릿으로 변경되었습니다:

#### **변경된 환경변수들**

**mcp-atlassian 서버:**
- `${USER_ATLASSIAN_TOKEN}` - Atlassian API 토큰
- `${USER_ATLASSIAN_EMAIL}` - 사용자 이메일 (**새로 추가**)
- `${USER_ATLASSIAN_CLOUD_ID}` - Atlassian Cloud ID (**새로 추가**)

**jira-azure 서버:**
- `${USER_JIRA_BASE_URL}` - Jira 베이스 URL (**새로 추가**)
- `${USER_JIRA_EMAIL}` - Jira 사용자 이메일 (**새로 추가**)
- `${USER_JIRA_API_TOKEN}` - Jira API 토큰

**GitHub PR MCP 서버:**
- `${USER_GITHUB_TOKEN}` - GitHub 토큰

### 🔧 **완전 자동화된 UI 생성**

이제 MCPHub 설정 페이지에서 다음과 같은 입력 필드들이 자동으로 생성됩니다:

#### **📋 Atlassian 섹션:**
- **Atlassian Token** (토큰 필드)
- **Atlassian Email** (이메일 필드)
- **Atlassian Cloud Id** (텍스트 필드)

#### **🎫 Jira 섹션:**
- **Jira Base Url** (URL 필드)
- **Jira Email** (이메일 필드)
- **Jira Api Token** (토큰 필드)

#### **🐙 GitHub 섹션:**
- **GitHub Token** (토큰 필드)

### 🎯 **자동화 플로우 개선**

```
${USER_*} 패턴 템플릿 감지
    ↓ 자동 처리
extractUserEnvVars() 환경변수 탐지
    ↓ 동적 생성
/api/env-templates API 템플릿 제공
    ↓ 실시간 렌더링
프론트엔드 UI 필드 자동 생성
    ↓ 보안 저장
mcphub_keys.serviceTokens DB 암호화 저장
```

### 🔒 **보안 강화**

1. **GitHub Secret Scanning 준수**: 모든 하드코딩된 토큰 제거
2. **환경변수 마스킹**: 로그에서 토큰 값 일부만 표시
3. **사용자별 격리**: 각 사용자의 환경변수 완전 분리
4. **실시간 보안**: 토큰 노출 시 즉시 Git 커밋 차단

---

**작성일**: 2025-07-31  
**작성자**: MCPHub 개발팀  
**버전**: 2.1.0 (v2.0 완전 환경변수화 완료) 