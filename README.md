# MCPHub - 동적 사용자 토큰 시스템

Cursor IDE에서 MCPHub를 통해 사용자별 API Key를 동적으로 주입하여 MCP 서버와 통신하는 시스템입니다.

## 🎯 주요 기능

- **동적 MCP 서버 연결**: 필요시에만 MCP 서버 연결
- **사용자별 API Key 관리**: AES-256-CBC 암호화 저장
- **템플릿 치환 시스템**: `${USER_*}` 템플릿으로 API Key 주입
- **보안 강화**: 토큰 마스킹 및 암호화

## 🚀 빠른 시작

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
npm start
```

### 환경 설정

1. `.env` 파일 생성
2. GitHub OAuth 설정
3. 데이터베이스 연결 설정

## 📋 Git 워크플로우

### 자동화된 Git 전략

프로젝트에는 메모리 보존과 지속성을 위한 자동화된 Git 워크플로우가 포함되어 있습니다.

#### 1. 기능 개발 시작

```bash
# 새 기능 브랜치 생성
./scripts/git-workflow.sh start-feature github-mcp-support
```

#### 2. 커밋 생성

```bash
# 의미있는 커밋 메시지로 커밋
./scripts/git-workflow.sh commit feat mcp "GitHub MCP 서버 동적 연결 구현"
./scripts/git-workflow.sh commit fix auth "사용자 인증 로직 수정"
./scripts/git-workflow.sh commit docs "README 업데이트"
```

#### 3. PR 생성

```bash
# PR 생성 (GitHub CLI 필요)
./scripts/git-workflow.sh create-pr "feat: GitHub MCP 서버 지원 추가"
```

#### 4. 마일스톤 관리

```bash
# 마일스톤 브랜치 생성
./scripts/git-workflow.sh create-milestone dynamic-connection-v1
```

### 커밋 메시지 규칙

- **feat**: 새로운 기능
- **fix**: 버그 수정
- **docs**: 문서 변경
- **style**: 코드 포맷팅
- **refactor**: 코드 리팩토링
- **test**: 테스트 추가/수정
- **chore**: 빌드 프로세스 변경

### 브랜치 전략

- `main`: 안정적인 메인 브랜치
- `feature/*`: 기능 개발 브랜치
- `milestone/*`: 마일스톤 브랜치
- `hotfix/*`: 긴급 수정 브랜치

## 📁 프로젝트 구조

```
mcphub/
├── src/
│   ├── services/
│   │   └── mcpService.ts          # 동적 MCP 서버 연결
│   ├── controllers/
│   │   └── oauthController.ts     # API Key 관리
│   └── ...
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   └── SettingsPage.tsx   # API Key 설정 UI
│   │   └── ...
│   └── ...
├── docs/
│   ├── database-schema.md         # 데이터베이스 스키마 문서
│   └── api-reference.md           # API 명세서
├── scripts/
│   ├── git-workflow.sh            # Git 워크플로우 자동화
│   ├── validate-schema.js         # 스키마 검증 스크립트
│   └── test-api.js               # API 테스트 스크립트
├── .github/
│   └── pull_request_template.md   # PR 템플릿
├── PROJECT_NOTES.md               # 프로젝트 노트
├── CHANGELOG.md                   # 변경 이력
└── .gitmessage                    # 커밋 메시지 템플릿
```

## 🧠 메모리 보존 시스템

### 핵심 문서

1. **PROJECT_NOTES.md**: 현재 상태와 다음 단계
2. **CHANGELOG.md**: 모든 변경사항 기록
3. **docs/database-schema.md**: 데이터베이스 스키마 문서
4. **docs/api-reference.md**: API 명세서
5. **PR 템플릿**: 메모리 보존용 상세한 PR 템플릿
6. **커밋 템플릿**: 일관된 커밋 메시지 형식

## 🗄️ 데이터베이스 관리

### 스키마 문서

데이터베이스 구조는 `docs/database-schema.md`에서 관리됩니다:

```bash
# 스키마 문서 확인
cat docs/database-schema.md
```

### 스키마 검증

```bash
# 현재 DB 스키마 검증
npm run db:validate

# 데이터베이스 백업
npm run db:export

# 데이터베이스 복원
npm run db:import
```

### API 테스트

```bash
# 모든 API 엔드포인트 테스트
npm run api:test

# 상세한 API 테스트 (환경변수 설정)
npm run api:test:verbose
```

### 주요 테이블

- **users**: GitHub OAuth 사용자 정보
- **mcphub_keys**: MCPHub API 키 관리
- **mcp_servers**: 동적 MCP 서버 설정
- **user_tokens**: 사용자별 서비스 토큰
- **vector_embeddings**: 스마트 라우팅용 벡터 임베딩

### 현재 구현 상태

| 구성 요소 | 상태 | 비고 |
|-----------|------|------|
| 사용자별 API Key 저장 | ✅ 완료 | AES-256-CBC 암호화 |
| 템플릿 치환 시스템 | ✅ 완료 | `${USER_*}` 템플릿 지원 |
| 동적 서버 연결 | ✅ 완료 | 필요시에만 연결 |
| MCP 서버 초기화 | ✅ 완료 | USER_ 템플릿 서버 건너뛰기 |
| 프론트엔드 UI | ✅ 완료 | Settings > API Keys 통합 |
| Firecrawl 연결 | ⚠️ 대기 | 서버 엔드포인트 확인 필요 |
| GitHub 연결 | 🔄 준비 | GITHUB_TOKEN으로 테스트 가능 |

## 🔧 개발 가이드

### 새로운 MCP 서버 추가

1. `mcp_settings.json`에 서버 설정 추가
2. `${USER_*}` 템플릿 사용
3. 프론트엔드에서 API Key 입력 필드 추가
4. 테스트 및 문서화

### API Key 관리

- 모든 API Key는 AES-256-CBC로 암호화
- 로그에서는 토큰 마스킹
- 사용자별로 독립적인 키 저장

## 📊 테스트

```bash
# 단위 테스트
npm run test

# 통합 테스트
npm run test:integration

# E2E 테스트
npm run test:e2e
```

## 🤝 기여하기

1. 이슈 생성 또는 기존 이슈 확인
2. 기능 브랜치 생성: `./scripts/git-workflow.sh start-feature <기능명>`
3. 개발 및 테스트
4. 커밋: `./scripts/git-workflow.sh commit <타입> <메시지>`
5. PR 생성: `./scripts/git-workflow.sh create-pr <제목>`

## 📄 라이선스

MIT License

## 🆘 문제 해결

### 일반적인 문제

1. **포트 충돌**: `Error: listen EADDRINUSE`
   - 해결: 다른 포트 사용 또는 기존 프로세스 종료

2. **Firecrawl 404 에러**: 정상 (서버가 아직 공개되지 않음)

3. **Git 설정 문제**: `./scripts/git-workflow.sh help` 확인

### 로그 확인

```bash
# 서버 로그 확인
npm start

# 프론트엔드 로그 확인
cd frontend && npm run dev
```

---

**마지막 업데이트**: 2025-07-27  
**현재 버전**: 0.1.0  
**다음 작업**: GitHub MCP 서버 동적 연결 테스트
