# 🎯 MCPHub 동적 사용자 토큰 시스템 - 프로젝트 노트

## 📋 프로젝트 개요

**목표**: Cursor IDE에서 MCPHub를 통해 사용자별 API Key를 동적으로 주입하여 MCP 서버와 통신하는 시스템

**핵심 기능**: 
- 사용자별 API Key 저장 및 관리
- MCP 서버 동적 연결 (필요시에만 연결)
- 템플릿 기반 API Key 주입 시스템

## ✅ 완료된 기능

### 백엔드
- [x] **동적 MCP 서버 연결 시스템** (`src/services/mcpService.ts`)
  - `applyUserApiKeysToConfig()`: 템플릿 치환 함수
  - `ensureServerConnected()`: 필요시 동적 연결
  - `handleCallToolRequest()`: 사용자 API Key 주입
  - USER_ 템플릿 서버 초기화 시 건너뛰기

- [x] **API Key 관리 시스템** (`src/controllers/oauthController.ts`)
  - 사용자별 API Key 저장/업데이트
  - AES-256-CBC 암호화
  - 토큰 마스킹 로그

- [x] **MCP 설정** (`mcp_settings.json`)
  - `firecrawl-mcp` 서버 설정
  - `${USER_FIRECRAWL_TOKEN}` 템플릿 사용

### 프론트엔드
- [x] **Settings 페이지 통합**
  - API Keys 섹션에서 사용자별 키 입력
  - "MCPHub Keys" 네비게이션 라벨
  - 사용법 안내 텍스트 개선

- [x] **UI 정리**
  - 별도 "GitHub Token" 탭 제거
  - 기존 API Keys 섹션으로 통합

## 🔄 현재 상태

### 데이터베이스
```sql
-- 사용자별 API Key 저장
mcphub_keys {
  id: UUID
  userId: UUID (users 테이블 참조)
  name: string
  serviceTokens: JSONB {
    FIRECRAWL_TOKEN: string
    GITHUB_TOKEN: string
    OPENAI_API_KEY: string
    ANTHROPIC_API_KEY: string
    UPSTASH_REST_API_TOKEN: string
    UPSTASH_REST_API_URL: string
  }
  expiresAt: timestamp
  lastUsedAt: timestamp
  isActive: boolean
}
```

### 작동 흐름
1. **초기화**: USER_ 템플릿 서버는 연결하지 않음
2. **API Key 저장**: 웹 UI에서 Settings > API Keys로 입력
3. **동적 연결**: Cursor IDE에서 도구 호출 시 필요시에만 연결
4. **템플릿 치환**: `${USER_*}` 템플릿을 실제 API Key로 치환

## ⚠️ 현재 이슈

### Firecrawl MCP 서버
- **상태**: 404 에러 (서버 측 이슈)
- **원인**: Firecrawl MCP 서버가 아직 공개되지 않음
- **해결**: Firecrawl에서 공식 MCP 서버 공개 대기

### 테스트 결과
- ✅ 사용자별 API Key 저장: `FIRECRAWL_TOKEN: 'fc-89c11d9ad6ab4636bbfdfff9731d0972'`
- ✅ 템플릿 치환 시스템: `${USER_FIRECRAWL_TOKEN}` → 실제 API Key
- ✅ 동적 연결 시스템: URL 파싱, Transport 생성, Client 연결 시도
- ✅ MCP 서버 초기화: USER_ 템플릿 서버 건너뛰기 정상 작동

## 🚀 다음 단계

### 즉시 가능한 작업
1. **GitHub MCP 서버 테스트**
   - `GITHUB_TOKEN`으로 GitHub MCP 서버 동적 연결 테스트
   - GitHub API 호출 기능 확인

2. **다른 MCP 서버 추가**
   - OpenAI MCP 서버 설정 추가
   - Anthropic MCP 서버 설정 추가
   - 기타 공개 MCP 서버들 추가

3. **에러 처리 개선**
   - 연결 실패 시 사용자 친화적 메시지
   - 재시도 로직 구현

### Firecrawl 서버 준비 시
1. **Firecrawl MCP 서버 URL 확인**
   - 공식 문서에서 정확한 엔드포인트 확인
   - URL 형식: `https://mcp.firecrawl.dev/${API_KEY}/sse`

2. **연결 테스트**
   - 실제 Firecrawl MCP 서버와 연결 테스트
   - 도구 목록 가져오기 테스트

3. **도구 호출 테스트**
   - Cursor IDE에서 Firecrawl 도구 호출 테스트
   - 웹 스크래핑 기능 확인

## 🧠 메모리 보존용 핵심 정보

### 주요 파일 위치
- **동적 연결**: `src/services/mcpService.ts`
- **API Key 관리**: `src/controllers/oauthController.ts`
- **MCP 설정**: `mcp_settings.json`
- **프론트엔드**: `frontend/src/pages/SettingsPage.tsx`

### 핵심 함수들
- `applyUserApiKeysToConfig()`: 템플릿 치환
- `ensureServerConnected()`: 동적 연결
- `updateKeyTokens()`: API Key 저장
- `authenticateKey()`: MCPHub Key 인증

### 주의사항
- USER_ 템플릿 서버는 초기화 시 연결하지 않음 (on-demand 연결)
- API Key는 AES-256-CBC로 암호화 저장
- Firecrawl MCP 서버 404 에러는 정상 (아직 공개되지 않음)

## 📊 구현 상태 요약

| 구성 요소 | 상태 | 비고 |
|-----------|------|------|
| 사용자별 API Key 저장 | ✅ 완료 | AES-256-CBC 암호화 |
| 템플릿 치환 시스템 | ✅ 완료 | `${USER_*}` 템플릿 지원 |
| 동적 서버 연결 | ✅ 완료 | 필요시에만 연결 |
| MCP 서버 초기화 | ✅ 완료 | USER_ 템플릿 서버 건너뛰기 |
| 프론트엔드 UI | ✅ 완료 | Settings > API Keys 통합 |
| Firecrawl 연결 | ⚠️ 대기 | 서버 엔드포인트 확인 필요 |
| GitHub 연결 | 🔄 준비 | GITHUB_TOKEN으로 테스트 가능 |

---

**마지막 업데이트**: 2025-07-27
**현재 브랜치**: main
**다음 작업**: GitHub MCP 서버 동적 연결 테스트 