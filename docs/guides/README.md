# MCPHub 가이드 모음

이 디렉토리는 MCPHub 프로젝트의 주요 가이드 문서들을 포함합니다.

## 📚 주요 가이드

### 👤 사용자 가이드
- [MCPHub 사용자 가이드](./user-guide.md) - 일반 사용자를 위한 친절한 안내서

### 🔧 개발 가이드
- [Node.js OpenTelemetry 완전 가이드](./nodejs-opentelemetry-complete-guide.md) - Loki, Tempo, Mimir 통합
- [Cursor IDE 통합 가이드](./cursor-ide-integration.md) - Cursor에서 MCPHub 사용하기

### 🏗️ 아키텍처
- [데이터베이스 스키마](./database-schema.md) - PostgreSQL 스키마 설계
- [MCP 세션 관리](./mcp-session-management.md) - 멀티유저 세션 시스템
- [업스트림 세션 스토어](./upstream-session-store.md) - Redis 기반 세션 관리

### 🔧 시스템 구성
- [환경변수 시스템](./mcphub-env-var-system.md) - 동적 환경변수 관리
- [프로젝트 현황](./mcphub-project-status.md) - 현재 구현 상태 및 로드맵

## 📋 가이드 작성 규칙

### 1. 파일 명명 규칙
- 소문자와 하이픈 사용: `guide-name.md`
- 명확하고 설명적인 이름 사용

### 2. 문서 구조
- 명확한 제목과 목차
- 단계별 설명
- 코드 예제 포함
- 트러블슈팅 섹션

### 3. 업데이트
- 변경사항 발생 시 즉시 업데이트
- 버전 정보 포함
- 관련 문서 링크 유지
