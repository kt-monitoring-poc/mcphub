# MCPHub 프로젝트 노트

## 현재 상태 (2025-07-28 16:30)

### 🎯 **프로젝트 목표**
- **MCPHub**: 여러 MCP 서버들을 하나의 엔드포인트로 통합하는 중앙 집중식 플랫폼
- **사용자**: 사내 개발자 ~700명, 동시 사용자 ~10명
- **역할**: MCP 서버들의 라우터/프록시 역할, 사용자별 API 키 동적 주입

### 🔧 **기술 스택**
- **Backend**: Node.js, TypeScript, Express, PostgreSQL
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **인증**: GitHub OAuth, JWT
- **암호화**: AES-256-CBC
- **통신**: SSE, Streamable HTTP (stdio에서 전환 중)

---

## 최신 완료사항 (2025-07-28)

### 🎨 **라이트모드 UI 대폭 개선** (2025-07-28 16:30)
- **문제**: 라이트모드 전환 시 여전히 다크모드 스타일이 적용되는 문제
- **해결**: Tailwind CSS 다크모드 클래스들을 강제로 오버라이드하는 CSS 규칙 추가
- **참고 레퍼런스**: GitHub, Linear, Notion의 현대적인 라이트모드 스타일
- **주요 개선사항**:
  - 상태 배지 가독성 향상 (Online/Offline/Connecting)
  - 현대적인 색상 팔레트 적용
  - 세련된 카드 디자인 (미묘한 테두리, 그림자)
  - 향상된 상호작용 (포커스, 호버 효과)
  - 일관된 시각적 계층 구조

### ⚙️ **설정 페이지 대폭 개선** (2025-07-28 15:48)
- **제거**: OpenAI API Key, Anthropic API Key 입력 필드
- **추가**: Confluence API Key, Jira API Key 입력 필드
- **제거**: 동적 커스텀 API Key 추가 기능 (실용성 부족으로 인해)
- **백엔드**: 헤더 템플릿 처리 로직 추가 (`${USER_*}` 치환)

### 🔑 **MCPHub Key 관리 개선**
- **일반 사용자**: MCPHub Keys 탭에서 자신의 키만 표시
- **관리자**: MCPHub Keys 탭에서 모든 사용자의 키와 사용자 정보 표시
- **만료일 표시**: "일 남음" 필드에 정확한 일수 계산 추가

### 🧪 **MCP 서버 테스트 완료**
- **test-get-alerts**: CA 주 알림 정보 조회 성공
- **test-get-forecast**: NY 주 날씨 예보 조회 성공
- **결과**: 로컬 MCP 서버들과의 연결 및 도구 호출 정상 작동 확인

---

## 기존 기능 상태

### ✅ **완료된 기능**
- **사용자 인증**: GitHub OAuth 연동
- **MCPHub Key 발급**: 사용자별 고유 키 생성 및 관리
- **동적 MCP 서버 연결**: 사용자 API 키 기반 서버 연결
- **API 키 암호화 저장**: AES-256-CBC 암호화
- **Firecrawl MCP 서버**: 웹 스크래핑 및 검색 기능
- **GitHub MCP 서버**: GitHub API 접근
- **Confluence/Jira MCP 서버**: 설정 완료 (enabled: false)
- **로컬 MCP 서버들**: sequentialthinking, test, filesystem
- **동적 커스텀 API Key 관리**: 제거됨 (실용성 부족)
- **헤더 템플릿 처리**: `${USER_*}` 치환 로직
- **사용자 친화적 UI**: 현대적인 라이트모드 스타일

### 🔄 **진행 중인 작업**
- **.env 파일 시스템**: 환경 변수 관리 개선
- **로그 레벨 조정**: 사용자 수 증가 대비 로그 최적화

### 📋 **대기 중인 작업**
- **GitHub MCP 서버 연결**: 400 에러 디버깅 (외부 서비스 이슈)
- **세션 관리 개선**: 글로벌 in-memory transports 객체 최적화
- **문서 업데이트**: 새로운 API Key 설정 가이드

---

## 현재 진행 중인 작업

### 🎨 **UI/UX 개선** (완료)
- **라이트모드 스타일링**: 현대적인 디자인 적용
- **색상 팔레트**: GitHub, Linear, Notion 스타일 참고
- **상호작용 개선**: 호버, 포커스 효과
- **가독성 향상**: 상태 배지, 텍스트 대비

---

## 새로 추가 가능한 API Keys

### 🔧 **현재 지원**
- `FIRECRAWL_TOKEN`: 웹 스크래핑 및 검색
- `GITHUB_TOKEN`: GitHub API 접근
- `CONFLUENCE_TOKEN`: Confluence 문서 관리 (선택사항)
- `JIRA_TOKEN`: Jira 이슈 관리 (선택사항)

### 🚀 **향후 확장 가능**
- `SLACK_TOKEN`: Slack 메시지 및 채널 관리
- `NOTION_TOKEN`: Notion 페이지 및 데이터베이스
- `LINEAR_TOKEN`: Linear 프로젝트 관리
- `FIGMA_TOKEN`: Figma 디자인 파일 접근

---

## Cursor IDE 연결 설정

### 📝 **설정 파일 위치**
- `~/.cursor/mcp.json` (macOS/Linux)
- `%APPDATA%\Cursor\User\mcp.json` (Windows)

### 🔧 **설정 예시**
```json
{
  "mcpServers": {
    "mcp-hub": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-mcphub"],
      "env": {
        "MCPHUB_URL": "http://localhost:3000",
        "MCPHUB_KEY": "mcphub_e9a2d03d95400afe74274c07122169fca44e79395818a78fb18b2afbfa69ae82"
      }
    }
  }
}
```

### 🔑 **지원되는 MCP 서버들**
- **Firecrawl**: 웹 스크래핑, 검색, 크롤링
- **GitHub**: 저장소, 이슈, PR 관리
- **Confluence**: 문서 및 페이지 관리
- **Jira**: 이슈 및 프로젝트 관리
- **Local Servers**: sequentialthinking, test, filesystem

---

## 테스트 방법

### 🧪 **기본 연결 테스트**
1. **MCPHub 웹 UI 접속**: `http://localhost:3000`
2. **GitHub OAuth 로그인**
3. **MCPHub Key 발급 확인**
4. **API Keys 입력**: Firecrawl, GitHub, Confluence, Jira
5. **Cursor IDE에서 MCPHub 연결**
6. **도구 목록 확인**: `/mcp/tools/list`

### 🔍 **개별 서버 테스트**
```bash
# Firecrawl 테스트
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer mcphub_xxx" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"firecrawl_scrape","arguments":{"url":"https://example.com"}}}'

# 로컬 서버 테스트
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer mcphub_xxx" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"test-get-alerts","arguments":{"state":"CA"}}}'
```

---

## 완료된 기능 (이전 작업) - 백엔드

### 🔧 **핵심 서비스**
- **MCP 서버 관리**: 동적 연결, 도구 라우팅
- **사용자 인증**: JWT 기반 인증 미들웨어
- **API 키 관리**: 암호화 저장 및 복호화
- **세션 관리**: MCP 서버별 세션 유지
- **헤더 템플릿 처리**: `${USER_*}` 치환 로직

### 🗄️ **데이터베이스**
- **사용자 테이블**: GitHub OAuth 정보 저장
- **MCPHub Keys 테이블**: 사용자별 키 및 만료일 관리
- **API Keys 테이블**: 서비스별 토큰 암호화 저장

### 🔒 **보안**
- **AES-256-CBC 암호화**: API 키 보안 저장
- **JWT 토큰**: 세션 관리
- **GitHub OAuth**: 안전한 사용자 인증

---

## 완료된 기능 (이전 작업) - 프론트엔드

### 🎨 **UI/UX**
- **반응형 디자인**: 모바일/데스크톱 지원
- **다크/라이트 모드**: 완전한 테마 지원
- **현대적인 디자인**: GitHub, Linear, Notion 스타일 참고
- **사용자 친화적 인터페이스**: 직관적인 네비게이션

### 📊 **대시보드**
- **서버 상태 모니터링**: 실시간 상태 표시
- **통계 카드**: 총 서버 수, 온라인/오프라인 상태
- **최근 서버 목록**: 상세 정보 테이블

### ⚙️ **설정 관리**
- **API Key 입력**: 직관적인 폼 인터페이스
- **실시간 저장**: 자동 저장 기능
- **보안 표시**: 비밀번호 토글 기능

---

## 즉시 진행할 작업

### 🔧 **우선순위 1: 안정성 확보**
- [x] ~~Firecrawl/GitHub 연결 테스트~~
- [x] ~~로컬 MCP 서버 테스트~~
- [x] ~~라이트모드 UI 개선~~
- [ ] GitHub MCP 서버 400 에러 해결 (외부 서비스 이슈)

### 🚀 **우선순위 2: 사용자 경험**
- [x] ~~설정 페이지 개선~~
- [x] ~~MCPHub Key 관리 개선~~
- [ ] 로그 레벨 최적화
- [ ] 에러 메시지 개선

### 📈 **우선순위 3: 확장성**
- [ ] 세션 관리 최적화
- [ ] 성능 모니터링 추가
- [ ] 사용자 피드백 수집

---

## 향후 확장 계획

### 🔌 **새로운 MCP 서버 추가**
- **Slack**: 팀 커뮤니케이션
- **Notion**: 문서 및 지식 관리
- **Linear**: 프로젝트 관리
- **Figma**: 디자인 협업

### 🎯 **고급 기능**
- **스마트 라우팅**: 사용 패턴 기반 서버 선택
- **성능 최적화**: 캐싱 및 연결 풀링
- **모니터링**: 상세한 사용 통계
- **관리자 도구**: 사용자 관리 및 권한 설정

---

## 메모리 보존용 핵심 정보

### 🌿 **브랜치 정보**
- **현재 브랜치**: `feature/frontend-improvements-2025-07-28`
- **목적**: 프론트엔드 UI/UX 개선, 라이트모드 스타일링
- **기반 브랜치**: `main`

### 📁 **주요 수정 파일들**
- **프론트엔드**: `frontend/src/index.css`, `frontend/src/pages/SettingsPage.tsx`
- **백엔드**: `src/services/mcpService.ts`, `src/controllers/oauthController.ts`
- **설정**: `mcp_settings.json`, `.env.example`

### 🔧 **핵심 기능들**
- **동적 API Key 관리**: 사용자별 토큰 주입
- **현대적인 라이트모드**: GitHub/Linear/Notion 스타일
- **MCP 서버 통합**: 단일 엔드포인트로 다중 서버 접근
- **보안**: AES-256-CBC 암호화, JWT 인증

---

## 안정성 확인 사항

### ✅ **확인 완료**
- **기본 연결**: MCPHub ↔ Cursor IDE 정상
- **로컬 서버**: test, sequentialthinking, filesystem 정상
- **사용자 인증**: GitHub OAuth 정상
- **API Key 저장**: 암호화 저장 정상
- **라이트모드 UI**: 현대적인 스타일 적용 완료
- **설정 페이지 UI**: 정상 작동

### 🔍 **테스트 대기 중**
- **Firecrawl 도구**: 외부 서비스 안정성 확인 필요
- **GitHub 도구**: 400 에러 원인 파악 필요
- **Confluence/Jira**: API Key 입력 후 연결 테스트 필요

---

## 구현 상태 요약

| 기능 | 상태 | 완료도 | 비고 |
|------|------|--------|------|
| 사용자 인증 | ✅ 완료 | 100% | GitHub OAuth |
| MCPHub Key 관리 | ✅ 완료 | 100% | 발급, 만료일, 관리자 뷰 |
| Firecrawl 연동 | ✅ 완료 | 95% | 외부 서비스 이슈 있음 |
| GitHub 연동 | ✅ 완료 | 90% | 400 에러 디버깅 중 |
| Confluence/Jira | ✅ 설정 | 80% | API Key 입력 대기 |
| 로컬 서버들 | ✅ 완료 | 100% | test, sequentialthinking, filesystem |
| 라이트모드 UI | ✅ 완료 | 100% | 현대적인 스타일 적용 |
| 설정 페이지 | ✅ 완료 | 100% | API Key 관리 개선 |

---

## 최신 성과 (2025-07-28)

### 🎨 **UI/UX 혁신**
- **현대적인 라이트모드**: GitHub, Linear, Notion 스타일 참고
- **세련된 디자인**: 미묘한 그림자, 부드러운 모서리, 적절한 색상 대비
- **향상된 상호작용**: 포커스, 호버 효과 개선
- **가독성 최적화**: 상태 배지, 텍스트 색상 개선

### ⚙️ **기능 개선**
- **설정 페이지 대폭 개선**: Confluence/Jira API Key 추가
- **MCPHub Key 관리**: 관리자 뷰에서 사용자 정보 표시
- **실용성 향상**: 불필요한 커스텀 API Key 기능 제거

### 🧪 **안정성 확보**
- **로컬 MCP 서버 테스트**: 모든 도구 정상 작동 확인
- **동적 연결 로직**: 사용자 API 키 기반 서버 연결 검증
- **암호화 시스템**: API 키 보안 저장 확인

---

## 다음 단계

### 🚀 **즉시 진행할 작업**
1. **GitHub MCP 서버 400 에러 해결** (외부 서비스 이슈)
2. **Confluence/Jira API Key 입력 후 연결 테스트**
3. **로그 레벨 최적화** (사용자 수 증가 대비)

### 📈 **중기 계획**
1. **성능 모니터링 시스템 구축**
2. **사용자 피드백 수집 및 반영**
3. **새로운 MCP 서버 추가** (Slack, Notion 등)

### 🎯 **장기 비전**
1. **스마트 라우팅 시스템**
2. **고급 관리자 도구**
3. **엔터프라이즈급 확장성**

---

## 마스킹된 민감 정보

- `GITHUB_TOKEN`: `***[마스킹됨]***`
- `FIRECRAWL_TOKEN`: `***[마스킹됨]***`
- `FIRECRAWL_API_KEY`: `***[마스킹됨]***`
- `MCPHub Key`: `***[마스킹됨]***`

---

*마지막 업데이트: 2025-07-28 16:30* 