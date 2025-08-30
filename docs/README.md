## 📚 MCPHub 문서 가이드

> **2025-08-09 업데이트**: 95개 문서를 체계적으로 정리하여 탐색성을 대폭 개선했습니다.

### 🚀 빠른 시작
- [빠른 시작 가이드](quickstart.mdx) - 5분 만에 MCPHub 시작
- [설치 가이드](installation.mdx) - 상세 설치 방법
- [환경 설정](configuration/) - 환경변수, MCP 설정, Docker 등

---

## 📂 주요 문서 카테고리

### 📖 가이드 (guides/)
**핵심 사용법과 시스템 이해를 위한 필수 문서들**
- [프로젝트 현황](guides/mcphub-project-status.md) 🌟 **MUST READ**
- [데이터베이스 스키마](guides/database-schema.md) 🌟 **CRITICAL**
- [Cursor IDE 통합](guides/cursor-ide-integration.md) - IDE 연결 가이드
- [환경변수 시스템](guides/mcphub-env-var-system.md) - 자동화된 토큰 관리
- [업스트림 세션 저장소](guides/upstream-session-store.md) - Redis 기반 세션 관리

### 🎓 튜토리얼 (tutorials/)
**단계별 학습과 실습을 위한 문서들**
- [세션 관리](tutorials/session-management.md) - MCP 세션 관리 심화
- [동시성 테스트](tutorials/concurrency-test.md) - 부하 테스트 가이드

### 📚 레퍼런스 (references/)
**API 명세와 기술 참조 문서들**
- [API 레퍼런스](references/api-reference.md) - REST API 전체 명세
- [라우팅 레퍼런스](references/routing-reference.md) - MCP 프로토콜 라우팅
- [OAuth 설정](references/oauth-setup-guide.md) - 인증 시스템 설정
- [OpenAPI 지원](references/openapi-support.md) - 스키마 기반 서버 연동
- [테스팅 프레임워크](references/testing-framework.md) - 테스트 도구

### ⚙️ 운영 (operations/)
**배포, 모니터링, 최적화 관련 문서들**
- [Docker 설정](operations/docker-setup.md) - 컨테이너 배포
- [Azure 배포](operations/azure-container-apps-deployment.md) - 클라우드 배포
- [타임아웃 최적화](operations/timeout-optimization-2025-08-09.md) - 성능 튜닝

### 🛠️ 개발 (development/)
**개발자를 위한 기술 문서들**
- [아키텍처](development/architecture.mdx) - 시스템 구조
- [컨트리뷰션](development/contributing.mdx) - 개발 참여 가이드
- [디버그 로깅](development/debug-logging.md) - 완전한 로깅 시스템

### 💼 사업 계획 (business-plan/)
**비즈니스 전략과 사업 관련 문서들**
- [MCPHub 사업계획서 2025](business-plan/mcphub-business-plan-2025.md) 🌟 **NEW** - 종합적인 사업계획서 (v3.1.1 기준)
- [비즈니스 문서 목록](business-plan/README.md) - 사업 관련 문서 안내

### 📈 로드맵 (roadmap/)
**프로젝트 진행 계획과 배포 전략**
- [MCPHub 로드맵 2025](roadmap/mcphub-roadmap-2025.md) 🚀 **NEW** - 2025년 로드맵 및 배포 계획 (Private 환경 배포 포함)

### 📖 개발 히스토리 (development-history/)
**개발 과정의 모든 변경사항과 문제 해결 과정**
- [**개발 히스토리 관리 시스템**](development-history/README.md) ⭐ - 체계적인 개발 기록 시스템
- [**2025-08-12 GitHub MCP 연결 문제 해결**](development-history/2025-08-12-github-mcp-connection-and-docker-build-fixes.md) - 오늘의 상세 개발 히스토리
- [**2025-08-12 소스코드 문서화 격차 분석**](development-history/2025-08-12-sourcecode-documentation-gap-analysis.md) - Jira 이슈 등록을 위한 문서화 필요 항목 분석

### 🌟 혁신 기능 (features/)
**특허 가능한 혁신적 기능들의 상세 개발 계획**
- [**특허 혁신 기능 로드맵**](features/patent-innovation-roadmap.mdx) 🚀 - 모든 혁신 기능의 개발 계획과 특허 전략
- [**AI 기반 자동 구성 시스템**](features/ai-powered-auto-configuration.mdx) 🤖 - 자연어 요구사항을 AI가 분석하여 MCP 서버 자동 구성
- [**실시간 성능 예측 및 자동 스케일링**](features/real-time-performance-prediction.mdx) 📊 - ML 기반 성능 예측으로 리소스 자동 조정
- [**기능 가이드**](features/README.md) 📚 - MCPHub의 모든 기능들을 체계적으로 정리한 가이드

### 🚨 트러블슈팅 (troubleshooting/)
**문제 해결과 장애 대응 가이드**
- [Cursor 연결 문제](troubleshooting/cursor-deadlock-fix-2025-08-09.md) - 서버 무응답 해결

### 📝 릴리즈 노트 (release-notes/)
**버전별 변경사항과 업그레이드 가이드**
- [v3.1.1 Cursor 호환성](release-notes/v3.1.1-cursor-compatibility-2025-08-08.md)
- [기타 릴리즈](release-notes/) - 전체 릴리즈 히스토리

---

## 🎯 역할별 권장 읽기 순서

### 👨‍💻 개발자/관리자
1. [프로젝트 현황](guides/mcphub-project-status.md) ⭐
2. [데이터베이스 스키마](guides/database-schema.md) ⭐
3. [**개발 히스토리 관리 시스템**](development-history/README.md) ⭐ - 최신 개발 과정 참조
4. [API 레퍼런스](references/api-reference.md)
5. [아키텍처](development/architecture.mdx)

### 🎮 Cursor 사용자
1. [빠른 시작](quickstart.mdx) ⭐
2. [Cursor IDE 통합](guides/cursor-ide-integration.md) ⭐
3. [트러블슈팅](troubleshooting/cursor-deadlock-fix-2025-08-09.md)

### 🚀 운영팀/DevOps
1. [설치 가이드](installation.mdx) ⭐
2. [Docker 설정](operations/docker-setup.md) ⭐
3. [Azure 배포](operations/azure-container-apps-deployment.md)
4. [타임아웃 최적화](operations/timeout-optimization-2025-08-09.md)

---

## 🗂️ 문서 구조 개선사항

- ✅ **95개 → 정리된 구조**: 중복 제거 및 체계적 분류
- ✅ **역할별 분류**: guides, tutorials, references, operations 등
- ✅ **우선순위 표시**: 🌟과 ⭐로 필수 문서 표시
- ✅ **보관 처리**: 오래된/중복 문서는 `archive/` 폴더로 이동

---

### 📦 기타 자료
- **아카이브**: [archive/](archive/) - 오래된 문서들
- **다국어**: [zh/](zh/) - 중국어 문서
- **Mintlify**: 기본 템플릿 구조는 그대로 유지

# Mintlify Starter Kit

Click on `Use this template` to copy the Mintlify starter kit. The starter kit contains examples including

- Guide pages
- Navigation
- Customizations
- API Reference pages
- Use of popular components

### Development

Install the [Mintlify CLI](https://www.npmjs.com/package/mintlify) to preview the documentation changes locally. To install, use the following command

```
npm i -g mintlify
```

Run the following command at the root of your documentation (where docs.json is)

```
mintlify dev
```

### Publishing Changes

Install our Github App to auto propagate changes from your repo to your deployment. Changes will be deployed to production automatically after pushing to the default branch. Find the link to install on your dashboard. 

#### Troubleshooting

- Mintlify dev isn't running - Run `mintlify install` it'll re-install dependencies.
- Page loads as a 404 - Make sure you are running in a folder with `docs.json`
