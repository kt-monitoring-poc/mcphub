# MCPHub v1.0.0 🎉

<div align="center">

**완전 자동화된 MCP 서버 환경변수 관리 시스템**

[![Version](https://img.shields.io/badge/version-v1.0.0-blue.svg)](https://github.com/jungchihoon/mcphub/releases/tag/v1.0.0)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-%3E%3D14.0.0-blue.svg)](https://postgresql.org/)

[빠른 시작](#-빠른-시작) • [문서](#-문서-가이드) • [기능](#-핵심-기능) • [API](#-api-문서) • [기여하기](#-기여하기)

</div>

---

## 🌟 MCPHub란?

**MCPHub**는 Model Context Protocol (MCP) 서버들을 중앙 집중식으로 관리하는 혁신적인 허브 플랫폼입니다. 

### 🎯 핵심 혁신
- **🔥 무코딩 확장**: 새 MCP 서버 추가 시 코드 수정 0줄
- **⚡ 완전 자동화**: 환경변수 입력 필드 자동 생성
- **🔒 프로덕션 준비**: GitHub OAuth + 암호화 + 벡터 검색
- **🚀 무한 확장**: 서버 수량/환경변수 수량 제한 없음

---

## 🚀 빠른 시작

### 📦 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/jungchihoon/mcphub.git
cd mcphub

# 의존성 설치
pnpm install

# 환경 설정
cp .env.example .env
# .env 파일에서 필요한 환경변수 설정

# 빌드 및 실행
npm run build
npm start
```

### 🎮 즉시 체험하기

1. **http://localhost:3000** 접속
2. **GitHub OAuth로 로그인**
3. **설정 페이지**에서 API 키 입력
4. **관리자라면** MCP 서버 관리 페이지 접근

---

## 📚 문서 가이드

### 🎯 **시작하기 (필수 읽기)**

| 문서 | 설명 | 중요도 |
|------|------|-------|
| 🎉 **[v1.0.0 릴리즈 노트](docs/release-notes/v1.0.0-release-2025-07-30.md)** | 최신 릴리즈 상세 정보 | ⭐⭐⭐ |
| 📊 **[프로젝트 현황](docs/mcphub-project-status.md)** | 전체 프로젝트 상태 및 완성도 | ⭐⭐⭐ |
| ⚡ **[환경변수 시스템](docs/mcphub-env-var-system.md)** | 핵심 자동화 시스템 가이드 | ⭐⭐⭐ |

### 🔧 **개발자 문서**

| 문서 | 설명 | 대상 |
|------|------|------|
| 🗄️ **[데이터베이스 스키마](docs/database-schema.md)** | 완전한 DB 구조 및 관계 | 백엔드 개발자 |
| 📡 **[API 참조](docs/api-reference.md)** | 모든 API 엔드포인트 명세 | 풀스택 개발자 |
| 🛣️ **[라우팅 참조](docs/routing-reference.md)** | 프론트엔드 라우팅 구조 | 프론트엔드 개발자 |

### 🚀 **설정 및 배포**

| 문서 | 설명 | 대상 |
|------|------|------|
| 🔐 **[OAuth 설정](docs/oauth-setup-guide.md)** | GitHub OAuth 설정 가이드 | 시스템 관리자 |
| 🏗️ **[설치 가이드](docs/installation.mdx)** | 상세한 설치 및 배포 가이드 | 운영팀 |
| ⚙️ **[환경 설정](docs/configuration/)** | 각종 설정 파일 관리 | 운영팀 |

### 🧪 **테스트 및 품질관리**

| 문서 | 설명 | 대상 |
|------|------|------|
| 🔬 **[테스트 프레임워크](docs/testing-framework.md)** | 테스트 구조 및 실행 방법 | QA/개발자 |
| 📋 **[OpenAPI 지원](docs/openapi-support.md)** | OpenAPI 스키마 지원 현황 | API 개발자 |

### 📖 **사용자 가이드**

| 문서 | 설명 | 대상 |
|------|------|------|
| ⚡ **[빠른 시작](docs/quickstart.mdx)** | 5분만에 MCPHub 시작하기 | 모든 사용자 |
| 🎯 **[기능 가이드](docs/features/)** | 각 기능별 상세 사용법 | 일반 사용자 |

---

## 🎯 핵심 기능

### ✅ **완성된 기능들 (v1.0.0)**

#### 🔥 **환경변수 자동화 시스템**
```
mcp_settings.json 서버 추가
    ↓ 자동 감지
extractUserEnvVars() 환경변수 탐지
    ↓ 자동 생성  
/api/env-templates API 템플릿 제공
    ↓ 자동 렌더링
프론트엔드 UI 필드 생성
    ↓ 자동 저장
mcphub_keys.serviceTokens DB 저장
```

#### 🔐 **GitHub OAuth 통합 인증**
- 원클릭 GitHub 로그인
- JWT 토큰 기반 세션 관리
- 자동 사용자 정보 동기화
- 관리자/일반 사용자 권한 분리

#### 👥 **관리자 UI 시스템**
- 📊 **관리자 대시보드**: 시스템 현황 모니터링
- 👥 **사용자 관리**: 사용자 목록 및 권한 관리  
- 🔧 **MCP 서버 관리**: `mcp_settings.json` 직접 편집
- 📈 **키 상태 모니터링**: 사용자별 API 키 현황

#### 🗄️ **데이터베이스 시스템**
- PostgreSQL + pgvector 확장
- TypeORM 자동 스키마 관리
- 암호화된 API 키 저장
- 벡터 검색 지원

#### 🛡️ **보안 로깅 시스템**
- 프로덕션용 로깅 시스템
- 민감한 정보 자동 마스킹
- 토큰 정보 로그 제거
- 디버그 로그 환경별 제어

---

## 🏗 시스템 아키텍처

### **백엔드 구조**
```
src/
├── controllers/     # API 컨트롤러 (12개)
├── routes/         # API 라우팅
├── services/       # 비즈니스 로직
├── middlewares/    # 인증/권한 미들웨어  
├── utils/          # 환경변수 감지 등 유틸리티
├── db/            # 데이터베이스 엔티티/리포지토리
└── config/        # 설정 관리
```

### **프론트엔드 구조**
```
frontend/src/
├── pages/         # 페이지 컴포넌트 (일반/관리자)
├── components/    # 재사용 컴포넌트
├── contexts/      # React Context (인증, 테마, 토스트)
├── hooks/         # 커스텀 훅
├── services/      # API 통신
└── utils/         # 유틸리티 함수 (로깅 등)
```

---

## 📡 API 문서

### **핵심 API 엔드포인트**

#### 🔐 **인증**
- `GET /api/oauth/github` - GitHub OAuth 로그인
- `GET /api/oauth/callback` - OAuth 콜백 처리
- `GET /api/user/me` - 현재 사용자 정보

#### ⚙️ **환경변수 관리**
- `GET /api/env-templates` - 서버별 환경변수 템플릿 조회
- `GET /api/user-env-vars` - 사용자 환경변수 조회
- `POST /api/user-env-vars` - 사용자 환경변수 저장

#### 🔧 **서버 관리**
- `GET /api/servers` - MCP 서버 목록 조회
- `GET /api/admin/settings-file` - mcp_settings.json 조회
- `PUT /api/admin/settings-file` - mcp_settings.json 수정

**📋 [전체 API 명세서 보기](docs/api-reference.md)**

---

## 🔧 개발 환경

### **기술 스택**
- **백엔드**: Node.js, TypeScript, Express, TypeORM
- **프론트엔드**: React, TypeScript, Vite, Tailwind CSS  
- **데이터베이스**: PostgreSQL + pgvector
- **인증**: GitHub OAuth, JWT
- **배포**: Docker, Docker Compose

### **개발 도구**
- **코드 품질**: ESLint, Prettier
- **테스트**: Jest
- **번들링**: Vite (프론트엔드), tsc (백엔드)
- **패키지 관리**: pnpm

### **프로젝트 관리**
- **Git 워크플로우**: Feature Branch 전략
- **브랜치 관리**: `main` (stable) → `feature/*` (development)
- **릴리즈 관리**: Semantic Versioning (v1.0.0)

---

## 📊 성능 및 확장성

### **무한 확장 가능성**
- ✅ **서버 수량 제한 없음**: 새 MCP 서버 무제한 추가
- ✅ **환경변수 수량 제한 없음**: 서버당 환경변수 무제한  
- ✅ **코드 수정 불필요**: 관리자 UI에서 모든 관리
- ✅ **실시간 적용**: 변경사항 즉시 반영

### **성능 최적화**
- **벡터 검색**: IVFFlat 인덱스로 도구 검색 최적화
- **API 최적화**: 필요한 데이터만 조회/전송
- **프론트엔드**: React 최적화 기법 적용
- **데이터베이스**: 적절한 인덱스 설정

---

## 🔮 로드맵

### **v2.0 계획 (진행 중)**
- **브랜치**: `feature/real-mcp-servers-v2`
- **목표**: 실제 MCP 서버 연결

#### **v2.0 주요 기능**
1. **실제 MCP 서버 통합**
   - GitHub MCP 서버 완전 연결
   - Firecrawl 웹 스크래핑 서비스
   - Jira 이슈 관리 시스템

2. **성능 최적화**
   - 실시간 모니터링 시스템
   - 연결 상태 자동 복구
   - 로드 밸런싱 구현

3. **사용자 경험 향상**
   - 실시간 알림 시스템
   - 고급 대시보드
   - 사용 통계 및 분석

---

## 🤝 기여하기

### **기여 방법**

1. **이슈 확인**: [GitHub Issues](https://github.com/jungchihoon/mcphub/issues)
2. **브랜치 생성**: `git checkout -b feature/새기능명`
3. **개발 및 테스트**: 코드 작성 및 테스트
4. **커밋**: Conventional Commits 규칙 준수
5. **PR 생성**: [PR 템플릿](.github/pull_request_template.md) 사용

### **커밋 메시지 규칙**
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드 프로세스 변경

---

## 📞 지원 및 커뮤니티

### **GitHub**
- **메인 저장소**: [jungchihoon/mcphub](https://github.com/jungchihoon/mcphub)
- **이슈 트래커**: [GitHub Issues](https://github.com/jungchihoon/mcphub/issues)
- **릴리즈**: [GitHub Releases](https://github.com/jungchihoon/mcphub/releases)

### **문서**
- **전체 문서**: [docs/](docs/)
- **API 참조**: [docs/api-reference.md](docs/api-reference.md)
- **설치 가이드**: [docs/installation.mdx](docs/installation.mdx)

---

## 📄 라이선스

이 프로젝트는 [MIT License](LICENSE) 하에 배포됩니다.

---

## 📈 프로젝트 통계

- **📁 총 파일**: 100개+
- **📝 코드 라인**: 15,000줄+
- **📚 문서**: 10개+
- **🎯 완성도**: 프로덕션 준비 완료

---

<div align="center">

**MCPHub v1.0.0 - 완전 자동화된 MCP 서버 환경변수 관리 시스템**

⭐ **이 프로젝트가 도움이 되었다면 Star를 눌러주세요!** ⭐

**최종 업데이트**: 2025년 7월 30일  
**현재 버전**: v1.0.0  
**다음 목표**: v2.0 - 실제 MCP 서버 연결

</div>
