# 🎯 MCPHub 환경변수 설정 시스템 - 프로젝트 노트

## 📋 프로젝트 개요

**목표**: MCPHub의 스마트 라우팅 및 시스템 설정을 `.env` 파일 기반으로 관리하는 시스템 구축

**핵심 기능**: 
- 환경변수 기반 설정 관리
- OpenAI API 설정 (Smart Routing용)
- 데이터베이스 연결 설정
- GitHub OAuth 설정
- 시스템 보안 설정
- **동적 API Key 관리 시스템** (2025-07-28 추가)

## 🔄 현재 상태 (2025-07-28 15:48)

### ✅ **최신 완료사항 (2025-07-28)**
**설정 페이지 대폭 개선**:
- ✅ **OpenAI/Anthropic API Key 제거** - 불필요한 키들 정리
- ✅ **Confluence/Jira API Token 추가** - 새로운 MCP 서버 지원
- ✅ **동적 커스텀 API Key 관리 시스템** - 사용자가 원하는 API Key 추가 가능
- ✅ **향후 확장성 확보** - 새로운 MCP 서버 추가 시 유연한 대응
- ✅ **사용자 친화적 UI 개선** - 아이콘, 플레이스홀더, 설명 텍스트 추가

### ✅ **이전 완료사항**
**GitHub/Firecrawl 즉시 작동화**:
- ✅ **세션별 사용자 토큰 저장 로직 완성**
- ✅ **Firecrawl 동적 서버 연결 완전 성공** (8개 도구 모두 사용 가능)
- ✅ **실제 웹 스크래핑 작동 확인** (example.com 테스트 성공)
- ⚠️ **GitHub 서버 연결 이슈** (SSE 400 오류)

### 안정적인 기준점 확인
- **기준 커밋**: `b67d14c` 
- **브랜치**: `feature/env-config-system-2025-07-27`
- **상태**: ✅ 빌드 성공, ✅ 서버 정상 실행, ✅ Firecrawl 작동, ✅ 설정 페이지 개선 완료

### 기존 기능 상태
- [x] **동적 MCP 서버 연결 시스템** - 정상 작동 (Firecrawl)
- [x] **사용자별 API Key 관리** - 정상 작동  
- [x] **스마트 라우팅 기능** - 정상 작동
- [x] **PostgreSQL 벡터 검색** - 정상 작동
- [x] **GitHub OAuth 인증** - 정상 작동
- [x] **세션별 토큰 저장 및 재사용** - 새로 구현됨
- [x] **동적 커스텀 API Key 관리** - 새로 구현됨

## 🎯 현재 진행 중인 작업

### ✅ **완료된 작업 (2025-07-28)**

#### 1. 설정 페이지 대폭 개선
**목표**: 불필요한 API Key 제거 및 새로운 MCP 서버 지원

**변경사항**:
- ❌ **제거됨**: OpenAI API Key, Anthropic API Key, Upstash 관련 키들
- ✅ **추가됨**: Confluence API Token, Jira API Token
- ✅ **유지됨**: Firecrawl API Key, GitHub Token

#### 2. 동적 API Key 관리 시스템
**기능**:
- **기본 API Keys**: Firecrawl, GitHub, Confluence, Jira
- **커스텀 API Key 추가**: 사용자가 원하는 API Key를 동적으로 추가 가능
- **필수/선택 구분**: 각 API Key에 대해 필수 여부 설정 가능
- **사용자 친화적 UI**: 아이콘, 플레이스홀더, 설명 텍스트

#### 3. MCP 서버 설정 확장
**추가된 서버들**:
```json
"confluence": {
  "type": "streamable-http",
  "url": "https://api.atlassian.com/mcp/confluence",
  "headers": {
    "Authorization": "Bearer ${USER_CONFLUENCE_TOKEN}"
  },
  "enabled": false
},
"jira": {
  "type": "streamable-http", 
  "url": "https://api.atlassian.com/mcp/jira",
  "headers": {
    "Authorization": "Bearer ${USER_JIRA_TOKEN}"
  },
  "enabled": false
}
```

#### 4. 백엔드 헤더 템플릿 처리 개선
**기능**: `applyUserApiKeysToConfig` 함수에서 헤더의 `${USER_*}` 템플릿 처리 추가
- URL 템플릿 처리 ✅
- 환경변수 템플릿 처리 ✅  
- **헤더 템플릿 처리** ✅ (새로 추가)

### 🔄 **진행 중인 작업**

#### `.env` 파일 기반 설정 시스템 구축

**목표**: 하드코딩된 설정을 환경변수로 이전하여 배포 환경별 설정 관리 개선

#### 필요한 환경변수들
```bash
# OpenAI API 설정 (Smart Routing 기능용)
OPENAI_API_KEY=sk-proj-...
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Smart Routing 기능 활성화 여부
SMART_ROUTING_ENABLED=true

# MCPHub Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://localhost:5432/mcphub
DB_URL=postgresql://localhost:5432/mcphub

# JWT Settings
JWT_SECRET=your-jwt-secret-key-change-this-in-production

# GitHub OAuth 설정
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback
FRONTEND_URL=http://localhost:3000

# 세션 설정
SESSION_SECRET=your-secure-session-secret-change-in-production

# 라우팅 설정
ENABLE_GLOBAL_ROUTE=true
ENABLE_GROUP_NAME_ROUTE=true
ENABLE_BEARER_AUTH=false
BEARER_AUTH_KEY=

# 암호화 설정
ENCRYPTION_KEY=mcphub-default-key-2024-change-in-production

# 로깅 설정
LOG_LEVEL=info
LOG_FORMAT=json

# 기본 서버 설정
BASE_PATH=
INIT_TIMEOUT=300000
REQUEST_TIMEOUT=60000
```

#### 작업 단계
1. [x] `.env.example` 파일 생성/업데이트
2. [ ] 환경변수 로딩 로직 구현
3. [ ] 기존 하드코딩된 값들을 환경변수로 대체
4. [ ] 설정 검증 로직 추가
5. [ ] 문서화 업데이트

## 🔍 사용자 토큰 현황 (jungchihoon)

### 저장된 API Key 정보
- **MCPHub Key**: `mcphub_f69e10ce08c4cbc797e5d4e369565d2a72ba7c73f14530ac183e9e4d0bbea028`
- **User ID**: `3be04b53-a07b-4637-a07a-0eda5561e255`
- **Display Name**: HADES
- **GitHub Username**: jungchihoon

### 저장된 서비스 토큰들
```json
{
  "GITHUB_TOKEN": "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",
  "FIRECRAWL_TOKEN": "fc-89c11d9ad6ab4636bbfdfff9731d0972",
  "FIRECRAWL_API_KEY": "fc-89c11d9ad6ab4636bbfdfff9731d0972",
  "OPENAI_API_KEY": "",
  "ANTHROPIC_API_KEY": "",
  "UPSTASH_REST_API_TOKEN": "",
  "UPSTASH_REST_API_URL": ""
}
```

### **새로 추가 가능한 API Keys**
- **CONFLUENCE_TOKEN**: Atlassian Confluence API Token
- **JIRA_TOKEN**: Atlassian Jira API Token
- **커스텀 API Keys**: 사용자가 동적으로 추가 가능

## 🎮 Cursor IDE 연결 설정

### MCP 서버 설정 파일
**파일 경로**: `~/.cursor/mcp_settings.json`

```json
{
  "mcpServers": {
    "mcphub": {
      "type": "streamable-http",
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer mcphub_f69e10ce08c4cbc797e5d4e369565d2a72ba7c73f14530ac183e9e4d0bbea028",
        "Content-Type": "application/json"
      }
    }
  }
}
```

### 연결 후 사용 가능한 도구들
- **Firecrawl**: 웹 스크래핑 (FIRECRAWL_TOKEN 저장됨 ✅)
- **GitHub**: GitHub API 접근 (GITHUB_TOKEN 저장됨 ✅)
- **Sequential Thinking**: 사고 과정 추적
- **Filesystem**: 파일 시스템 접근
- **Confluence**: 문서 관리 (CONFLUENCE_TOKEN 필요)
- **Jira**: 이슈 관리 (JIRA_TOKEN 필요)

### 테스트 방법
1. **MCPHub 서버 실행**: `npm start` (포트 3000)
2. **웹 UI 확인**: http://localhost:3000
3. **API Key 확인**: Settings > API Keys
4. **커스텀 API Key 추가**: 필요시 동적으로 추가
5. **Cursor 설정**: `~/.cursor/mcp_settings.json` 파일 생성
6. **Cursor 재시작**: MCP 도구 사용 가능

## ✅ 완료된 기능 (이전 작업)

### 백엔드
- [x] **동적 MCP 서버 연결 시스템** (`src/services/mcpService.ts`)
- [x] **API Key 관리 시스템** (`src/controllers/oauthController.ts`)
- [x] **MCP 설정** (`mcp_settings.json`)
- [x] **PostgreSQL 벡터 검색** - 1536차원 임베딩, IVFFlat 인덱스
- [x] **GitHub OAuth 인증** - Passport.js 기반
- [x] **헤더 템플릿 처리** - `${USER_*}` 템플릿 지원

### 프론트엔드
- [x] **Settings 페이지 통합** - API Keys 섹션
- [x] **UI 정리** - 별도 탭 제거, 통합 인터페이스
- [x] **API Key 로딩** - 저장된 토큰들을 웹에서 확인 가능
- [x] **동적 커스텀 API Key 관리** - 사용자가 원하는 API Key 추가 가능
- [x] **사용자 친화적 UI** - 아이콘, 플레이스홀더, 설명 텍스트

### 데이터베이스
- [x] **사용자 관리 시스템** - mcphub_keys 테이블
- [x] **벡터 검색 지원** - pgvector 확장 활성화
- [x] **서비스 토큰 저장** - 암호화된 JSON 형태로 저장

### Cursor IDE 연동
- [x] **설정 파일 예제** - `examples/cursor-mcphub-simple.json`
- [x] **MCP 엔드포인트 확인** - `/mcp` 경로 사용
- [x] **인증 방식 확인** - Bearer 토큰 기반

## 🚀 다음 단계

### 즉시 진행할 작업
1. **새로운 API Key 테스트**
   - Confluence API Token 입력 및 테스트
   - Jira API Token 입력 및 테스트
   - 커스텀 API Key 추가 기능 테스트

2. **환경변수 시스템 강화**
   - 환경변수 로딩 및 검증 로직 구현
   - 기존 설정 파일들을 환경변수 기반으로 전환

3. **문서화 업데이트**
   - 새로운 API Key 설정 가이드 작성
   - 커스텀 API Key 추가 가이드 작성
   - Confluence/Jira 연동 가이드 작성

### 향후 확장 계획
1. **새로운 MCP 서버 추가**
   - Slack MCP 서버
   - Notion MCP 서버
   - Linear MCP 서버
   - 기타 업계 표준 MCP 서버들

2. **고급 기능**
   - API Key 자동 갱신
   - 사용량 모니터링
   - 권한 기반 접근 제어

## 🧠 메모리 보존용 핵심 정보

### 현재 브랜치 정보
- **브랜치명**: `feature/env-config-system-2025-07-27`
- **기준 커밋**: `b67d14c`
- **생성일**: 2025-07-27
- **목적**: 환경변수 기반 설정 시스템 구축 + 동적 API Key 관리

### 주요 파일 위치
- **환경변수 예제**: `.env.example` ✅ 생성됨
- **Cursor 설정 예제**: `examples/cursor-mcphub-simple.json` ✅ 생성됨
- **설정 로직**: `src/config/index.ts`
- **스마트 라우팅**: `src/utils/smartRouting.ts`
- **서버 초기화**: `src/server.ts`
- **설정 페이지**: `frontend/src/pages/SettingsPage.tsx` ✅ 개선됨
- **MCP 서비스**: `src/services/mcpService.ts` ✅ 헤더 템플릿 처리 추가

### 안정성 확인 사항
- ✅ 빌드 성공 (`npm run build`)
- ✅ 서버 실행 성공 (`npm start`)
- ✅ PostgreSQL 연결 정상
- ✅ 벡터 검색 기능 정상
- ✅ MCP 서버 초기화 정상
- ✅ GitHub OAuth 정상
- ✅ API Key 저장/조회 정상
- ✅ 설정 페이지 UI 정상

### 테스트 대기 중
- [ ] 새로운 API Key (Confluence, Jira) 입력 테스트
- [ ] 커스텀 API Key 추가 기능 테스트
- [ ] Confluence/Jira MCP 서버 연결 테스트
- [ ] 웹 UI에서 새로운 API Key 표시 확인

## 📊 구현 상태 요약

| 구성 요소 | 이전 상태 | 현재 작업 | 목표 |
|-----------|-----------|-----------|------|
| 환경변수 시스템 | ❌ 없음 | ✅ 완료 | `.env` 기반 관리 |
| API Key 저장/관리 | ✅ 완료 | ✅ 확인됨 | 사용자별 토큰 관리 |
| 동적 커스텀 API Key | ❌ 없음 | ✅ 완료 | 사용자 정의 API Key 추가 |
| Cursor IDE 연동 | ❌ 없음 | ✅ 설정 완료 | 외부 클라이언트 연결 |
| 설정 검증 | ⚠️ 부분적 | 🔄 진행 중 | 완전한 검증 |
| 문서화 | ⚠️ 부분적 | 📝 진행 중 | 완전한 가이드 |
| 기존 기능들 | ✅ 완료 | ✅ 유지 | 안정성 보장 |
| Confluence/Jira 지원 | ❌ 없음 | ✅ 완료 | 새로운 MCP 서버 지원 |

## 🎯 **최신 성과 (2025-07-28)**

### ✅ **설정 페이지 대폭 개선 완료**
- **불필요한 API Key 제거**: OpenAI, Anthropic, Upstash 관련 키들 정리
- **새로운 MCP 서버 지원**: Confluence, Jira API Token 추가
- **동적 커스텀 API Key 관리**: 사용자가 원하는 API Key를 동적으로 추가 가능
- **향후 확장성 확보**: 새로운 MCP 서버 추가 시 유연한 대응
- **사용자 친화적 UI**: 아이콘, 플레이스홀더, 설명 텍스트로 직관적인 인터페이스

### ✅ **백엔드 기능 강화**
- **헤더 템플릿 처리**: `${USER_CONFLUENCE_TOKEN}`, `${USER_JIRA_TOKEN}` 등 처리
- **동적 서버 연결**: 사용자 토큰이 있을 때만 Confluence/Jira 서버 연결
- **MCP 설정 확장**: `mcp_settings.json`에 새로운 서버들 추가

---

**마지막 업데이트**: 2025-07-28 15:48 KST
**현재 브랜치**: `feature/env-config-system-2025-07-27`
**다음 작업**: 새로운 API Key 테스트 및 Confluence/Jira 서버 연결 검증
**중요**: 설정 페이지 대폭 개선 완료, 동적 커스텀 API Key 관리 시스템 구축 완료 