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

## 🧹 환경변수 생명주기 관리 (v3.0 신규)

### **1. 자동 정리 시스템**

#### **서버 제거 시 자동 정리**
MCP 서버가 `mcp_settings.json`에서 제거되면, 관련된 모든 사용자 환경변수가 자동으로 정리됩니다.

```typescript
// 서버 삭제 시 자동 실행
export const deleteServer = async (req: Request, res: Response) => {
  const serverConfig = settings.mcpServers?.[name];
  const result = removeServer(name);
  
  if (result.success && serverConfig) {
    // 🧹 관련 환경변수 자동 정리
    const cleanupResult = await cleanupServerEnvVars(name, serverConfig, false);
    console.log(`환경변수 정리: ${cleanupResult.affectedUsers}명 처리`);
  }
}
```

#### **고아 키 자동 감지 및 정리**
- 더 이상 사용되지 않는 `USER_*` 키들을 자동으로 감지
- 사용자별로 불필요한 환경변수 일괄 제거
- 정리 전 시뮬레이션 모드 지원

### **2. 검증 및 모니터링**

#### **시작 시 자동 검증**
서버 시작 시 환경변수 매핑 무결성을 자동으로 검증합니다.

```bash
🔍 환경변수 매핑 검증 중...
✅ 검증 성공: 환경변수 매핑이 올바릅니다.
💡 3개의 사용되지 않는 환경변수가 있습니다.
```

#### **실시간 검증 API**
```bash
GET /api/env-vars/validate    # 전체 매핑 검증
GET /api/env-vars/report      # 사용 현황 보고서
POST /api/env-vars/cleanup    # 고아 키 정리
```

### **3. CLI 관리 도구**

새로운 npm 스크립트로 환경변수를 체계적으로 관리할 수 있습니다.

```bash
# 환경변수 검증
npm run env:validate

# 정리 시뮬레이션
npm run env:cleanup:dry-run

# 실제 정리 실행
npm run env:cleanup

# 사용 현황 보고서
npm run env:report

# 상세 보고서 (사용자별 정보 포함)
npm run env:report:detailed
```

#### **보고서 예시**
```
📊 MCPHub 환경변수 사용 현황 보고서
========================================

📊 전체 요약
   - 총 MCP 서버: 4개
   - 총 환경변수: 7개  
   - 총 사용자: 12명

🖥️ 서버별 환경변수 사용률
   github: 85.0% (10/12명)
      필요 환경변수: USER_GITHUB_TOKEN
   jira: 42.0% (5/12명)
      필요 환경변수: USER_ATLASSIAN_JIRA_TOKEN, USER_ATLASSIAN_JIRA_EMAIL, USER_ATLASSIAN_JIRA_URL

🔑 환경변수별 사용률
   USER_GITHUB_TOKEN: 85.0% (10/12명)
      사용 서버: github
   USER_ATLASSIAN_JIRA_TOKEN: 42.0% (5/12명)
      사용 서버: jira

💡 권장사항
   - 높은 사용률의 환경변수들은 잘 설정되어 있습니다:
     USER_GITHUB_TOKEN (85.0%)
```

## 🔧 고급 관리 기능

### **1. 환경변수 마이그레이션**

서버 설정 변경 시 기존 환경변수를 새로운 형식으로 자동 마이그레이션합니다.

```typescript
// 예: GITHUB_TOKEN → USER_GITHUB_TOKEN 자동 변환
const migrationResult = await migrateEnvVarKeys({
  'GITHUB_TOKEN': 'USER_GITHUB_TOKEN',
  'JIRA_TOKEN': 'USER_ATLASSIAN_JIRA_TOKEN'
});
```

### **2. 배치 환경변수 관리**

관리자가 여러 사용자의 환경변수를 일괄 관리할 수 있습니다.

```bash
# 모든 사용자의 특정 환경변수 상태 확인
GET /api/admin/env-vars?varName=USER_GITHUB_TOKEN

# 배치 업데이트 (관리자 전용)
POST /api/admin/env-vars/batch-update
{
  "varName": "USER_GITHUB_TOKEN",
  "users": ["user1", "user2"],
  "action": "clear" | "migrate" | "validate"
}
```

### **3. 환경변수 템플릿 검증**

`mcp_settings.json` 파일의 환경변수 템플릿 문법을 검증합니다.

```typescript
// 잘못된 템플릿 예시
{
  "env": {
    "GITHUB_TOKEN": "${USER_GITHUB}"  // ❌ USER_ 접두사 불완전
  }
}

// 올바른 템플릿 예시
{
  "env": {
    "GITHUB_TOKEN": "${USER_GITHUB_TOKEN}"  // ✅ 올바른 형식
  }
}
```

## 📋 베스트 프랙티스

### **1. 환경변수 네이밍 규칙**

```bash
# ✅ 올바른 네이밍
USER_GITHUB_TOKEN          # GitHub API 토큰
USER_ATLASSIAN_JIRA_EMAIL  # Jira 이메일
USER_ATLASSIAN_JIRA_URL    # Jira 인스턴스 URL
USER_OPENAI_API_KEY        # OpenAI API 키

# ❌ 잘못된 네이밍
GITHUB_TOKEN               # USER_ 접두사 누락
USER_TOKEN                 # 서비스명 불명확
user_github_token          # 소문자 사용
```

### **2. 서버 설정 시 주의사항**

```json
{
  "github": {
    "command": "npx",
    "args": ["@modelcontextprotocol/server-github"],
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "${USER_GITHUB_TOKEN}"
    }
  }
}
```

**주의점:**
- 외부 MCP 서버가 요구하는 환경변수명 (`GITHUB_PERSONAL_ACCESS_TOKEN`)과 
- MCPHub 내부 환경변수명 (`USER_GITHUB_TOKEN`)을 정확히 매핑
- `${USER_*}` 템플릿 문법 준수

### **3. 정기적인 유지보수**

```bash
# 월간 환경변수 정리 (추천)
npm run env:report
npm run env:cleanup:dry-run
npm run env:cleanup  # 문제 없을 시 실행

# 서버 추가/제거 후 검증
npm run env:validate
```

### **4. 프로덕션 환경에서의 주의사항**

1. **검증 우선**: 프로덕션 배포 전 `env:validate` 필수 실행
2. **백업**: 환경변수 정리 전 DB 백업 수행
3. **단계적 적용**: `dry-run` 모드로 영향도 먼저 확인
4. **모니터링**: 정리 후 서비스 정상 작동 확인

## 🚨 문제 해결

### **1. 일반적인 문제들**

#### **환경변수가 인식되지 않는 경우**
```bash
# 1. 템플릿 검증
npm run env:validate

# 2. 서버 재시작
npm run build
npm start

# 3. 브라우저 캐시 초기화
```

#### **고아 키가 계속 생성되는 경우**
```bash
# mcp_settings.json의 환경변수 템플릿 확인
npm run env:report

# 서버 설정과 실제 DB 키 매핑 비교
npm run env:validate
```

### **2. 디버깅 도구**

#### **환경변수 추적**
```bash
# 특정 사용자의 환경변수 상태 확인
curl -X GET "http://localhost:3000/api/env-vars/report" \
  -H "Authorization: Bearer <token>"

# 서버별 환경변수 요구사항 확인  
cat mcp_settings.json | jq '.mcpServers | to_entries[] | {name: .key, envVars: [.value | .. | strings? | select(test("\\$\\{USER_[^}]+\\}")) | capture("\\$\\{(?<var>[^}]+)\\}").var] | unique}'
```

## 🔮 향후 개발 계획

### **Phase 1: 완료 (v3.0)**
- ✅ 자동 환경변수 정리
- ✅ 매핑 검증 시스템
- ✅ CLI 관리 도구
- ✅ 실시간 보고서

### **Phase 2: 예정 (v3.1)**
- 🔄 환경변수 암호화 강화
- 🔄 GraphQL API 지원
- 🔄 환경변수 버전 관리
- 🔄 자동 마이그레이션 도구

### **Phase 3: 계획 (v3.2)**
- 📋 환경변수 템플릿 UI 편집기
- 📋 다중 환경 지원 (dev/staging/prod)
- 📋 환경변수 사용량 분석
- 📋 보안 감사 로그

---

**작성일**: 2025-07-31  
**업데이트**: 2025-07-31 (v3.0 생명주기 관리 추가)  
**작성자**: MCPHub 개발팀  
**버전**: 3.1.0 (자동 관리 시스템 완료)

---

## 🤖 자동 관리 시스템 (v3.1 신규)

### 📅 주기적 자동 정리 스케줄러

MCPHub는 이제 **백그라운드 스케줄러**를 통해 환경변수를 자동으로 관리합니다.

#### ⚙️ 스케줄러 설정

```typescript
interface SchedulerConfig {
  enabled: boolean;          // 스케줄러 활성화 여부
  intervalHours: number;     // 검증 주기 (시간)
  autoCleanup: boolean;      // 자동 정리 활성화 (기본: false)
  maxOrphanedKeys: number;   // 알림 임계값 (고아 키 개수)
}
```

#### 🎮 환경변수로 제어

```bash
# 개발 환경에서 스케줄러 활성화
ENV_SCHEDULER_ENABLED=true pnpm start:dev

# 자동 정리 활성화 (위험 - 프로덕션에서 신중하게)
ENV_AUTO_CLEANUP=true pnpm start:dev
```

#### 🔄 자동 실행 작업

1. **환경변수 매핑 검증**
   - `mcp_settings.json`과 DB 데이터 일치성 확인
   - 오류 및 경고 감지

2. **고아 환경변수 탐지**
   - 더 이상 사용되지 않는 환경변수 식별
   - 임계값 초과시 알림

3. **자동 정리 (선택사항)**
   - `autoCleanup: true`인 경우 고아 키 자동 제거
   - 안전성을 위해 기본적으로 비활성화

### 🖥️ 웹 UI 관리 도구

관리자는 **`/admin/env-vars`** 페이지에서 환경변수를 시각적으로 관리할 수 있습니다.

#### 📊 실시간 모니터링

- **MCP 서버 수**: 현재 등록된 서버 개수
- **환경변수 수**: 전체 환경변수 개수  
- **총 사용자 수**: 등록된 사용자 수
- **고아 키 수**: 사용되지 않는 환경변수 개수

#### ⚙️ 스케줄러 제어

- **실행 상태**: 스케줄러 활성화/비활성화 상태
- **다음 실행 시간**: 자동 검증 예정 시간
- **설정 변경**: 주기, 임계값, 자동 정리 옵션 실시간 변경

#### 🔧 수동 작업

- **검증 실행**: 즉시 환경변수 검증 수행
- **정리 시뮬레이션**: 실제 제거 전 미리보기
- **실제 정리 실행**: 고아 환경변수 즉시 제거

### 🛡️ API 엔드포인트

#### 스케줄러 관리 (관리자 전용)

```bash
# 스케줄러 상태 조회
GET /api/admin/env-scheduler/status

# 스케줄러 설정 업데이트
POST /api/admin/env-scheduler/config
{
  "enabled": true,
  "intervalHours": 12,
  "autoCleanup": false,
  "maxOrphanedKeys": 5
}

# 수동 검증 실행
POST /api/admin/env-scheduler/run
```

#### 환경변수 관리

```bash
# 검증 실행
GET /api/env-vars/validate

# 정리 실행 (시뮬레이션)
POST /api/env-vars/cleanup
{ "dryRun": true }

# 실제 정리 실행
POST /api/env-vars/cleanup
{ "dryRun": false }

# 사용 현황 보고서
GET /api/env-vars/report
```

### 📋 CLI 도구

자동 관리 시스템과 별도로 CLI 도구도 제공됩니다:

```bash
# 환경변수 검증
npm run env:validate

# 사용 현황 보고서
npm run env:report
npm run env:report:detailed

# 정리 (시뮬레이션)
npm run env:cleanup:dry-run

# 실제 정리
npm run env:cleanup
```

### ⚠️ 안전 장치

1. **기본값 보수적 설정**
   - `autoCleanup: false` (기본적으로 자동 정리 비활성화)
   - 관리자가 명시적으로 활성화해야 함

2. **시뮬레이션 모드**
   - 모든 정리 작업은 먼저 시뮬레이션으로 실행 가능
   - 실제 제거 전 영향도 확인

3. **상세 로깅**
   - 모든 자동 작업은 콘솔에 상세 로그 출력
   - 정리된 키와 영향받은 사용자 수 기록

4. **관리자 권한 필요**
   - 스케줄러 설정 변경은 관리자만 가능
   - 실제 정리 실행도 관리자 권한 필요

### 📈 모니터링 및 알림

#### 자동 알림 조건

- **오류 발생**: 환경변수 매핑 오류 감지시
- **임계값 초과**: 고아 키가 설정된 개수 이상 발견시
- **정리 완료**: 자동 정리 실행 완료시

#### 로그 예시

```
🔍 환경변수 자동 검증 시작...
📊 검증 결과: 오류 0개, 경고 2개, 고아 키 3개
⚠️  3개의 사용되지 않는 환경변수가 있습니다!
✅ 환경변수 자동 검증 완료
```

### 🔧 문제 해결

#### 스케줄러가 실행되지 않는 경우

1. **개발 환경에서 활성화**:
   ```bash
   ENV_SCHEDULER_ENABLED=true pnpm start:dev
   ```

2. **프로덕션 환경에서는 기본 활성화**:
   - `NODE_ENV=production`에서 자동 활성화

3. **스케줄러 상태 확인**:
   ```bash
   curl http://localhost:3000/api/admin/env-scheduler/status
   ```

#### 자동 정리가 작동하지 않는 경우

1. **설정 확인**:
   - `autoCleanup: true`로 설정되어 있는지 확인

2. **고아 키 임계값 확인**:
   - 현재 고아 키 수가 `maxOrphanedKeys` 미만인지 확인

3. **수동 정리로 테스트**:
   ```bash
   npm run env:cleanup:dry-run
   ```

### 🚀 향후 계획

- **이메일 알림**: 관리자에게 환경변수 이슈 자동 통지
- **슬랙 연동**: 팀 채널로 정리 결과 자동 전송
- **사용 통계**: 환경변수별 사용 빈도 분석
- **자동 백업**: 정리 전 환경변수 상태 백업 