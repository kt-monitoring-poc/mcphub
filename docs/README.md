## 문서 안내 (Docs Overview)

문서가 많아져 탐색이 어려운 점을 해결하기 위해 핵심 문서들을 역할별로 묶어 정리했습니다. 아래 링크부터 확인해 주세요.

### 시작하기
- Quick Start: `docs/quickstart.mdx`
- 설치 가이드: `docs/installation.mdx`
- 환경변수/설정: `docs/configuration/environment-variables.mdx`, `docs/configuration/mcp-settings.mdx`

### 핵심 아키텍처/상태
- 프로젝트 현황: `docs/mcphub-project-status.md`
- 데이터베이스 스키마(중요): `docs/database-schema.md`
- MCP 프로토콜/라우팅: `docs/routing-reference.md`, `docs/development/architecture.mdx`

### 기능 가이드
- 서버/그룹 관리: `docs/features/server-management.mdx`, `docs/features/group-management.mdx`
- 인증/키: `docs/features/authentication.mdx`, `docs/api-reference.md`
- 스마트 라우팅: `docs/features/smart-routing.mdx`

### Cursor IDE 통합/호환성
- Cursor 통합 가이드: `docs/cursor-ide-integration.md`
- 오퍼링/네고시에이션 호환성 개선 노트: `docs/release-notes/v3.1.1-cursor-compatibility-2025-08-08.md`

### 트러블슈팅
- 서버 데드락 문제 해결: `docs/troubleshooting/cursor-deadlock-fix-2025-08-09.md`

### 세션/동시성
- 업스트림 세션 저장소(REDIS): `docs/upstream-session-store.md`
- 동시성 테스트: `docs/concurrency-test.md`

### 배포/운영
- Docker/Nginx: `docs/configuration/docker-setup.mdx`, `docs/configuration/nginx.mdx`
- 로깅/디버깅: `README.md`(루트) Debug Logging 섹션

필수 문서는 위 목록에서 별표(중요)로 표시된 문서들입니다. 문서-코드가 불일치하면 즉시 문서를 최신 상태로 반영해 주세요.

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
