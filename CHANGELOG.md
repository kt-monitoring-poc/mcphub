# Changelog

모든 주요 변경사항은 이 파일에 기록됩니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 따르며,
이 프로젝트는 [Semantic Versioning](https://semver.org/lang/ko/)을 준수합니다.

## [Unreleased]

### Added
- 동적 MCP 서버 연결 시스템 구현
  - `applyUserApiKeysToConfig()`: 템플릿 치환 함수
  - `ensureServerConnected()`: 필요시 동적 연결 함수
  - `handleCallToolRequest()`: 사용자 API Key 주입 로직
- 사용자별 API Key 관리 시스템
  - AES-256-CBC 암호화 저장
  - 토큰 마스킹 로그 시스템
  - MCPHub Key 기반 인증
- Firecrawl MCP 서버 설정 추가
  - `${USER_FIRECRAWL_TOKEN}` 템플릿 지원
  - on-demand 연결 방식
- 프론트엔드 Settings 페이지 통합
  - API Keys 섹션에서 사용자별 키 입력
  - "MCPHub Keys" 네비게이션 라벨 추가
- GitHub PR 템플릿 추가
- Git 커밋 메시지 템플릿 추가
- 프로젝트 노트 문서화

### Changed
- MCP 서버 초기화 로직 개선
  - USER_ 템플릿 서버는 초기화 시 연결하지 않음
  - 필요시에만 동적으로 연결하는 방식으로 변경
- 프론트엔드 Settings 페이지 구조 개선
  - 별도 "GitHub Token" 탭 제거
  - 기존 API Keys 섹션으로 통합
- API Key 저장 방식 변경
  - on-demand 연결 방식으로 변경
  - 서버 재시작 없이 즉시 사용 가능

### Fixed
- USER_ 템플릿 서버 건너뛰기 로직 수정
- API Key 마스킹 로그 개선
- 프론트엔드 네비게이션 메뉴 정리

### Security
- API Key AES-256-CBC 암호화 저장
- 토큰 로그 마스킹으로 보안 강화

## [0.1.0] - 2025-07-27

### Added
- 기본 MCPHub 서버 구조
- GitHub OAuth 인증 시스템
- 사용자 관리 시스템
- 기본 MCP 서버 연결 (sequentialthinking, test, filesystem, github)
- 프론트엔드 React + TypeScript 구조
- 관리자/일반 사용자 권한 시스템

### Changed
- 초기 프로젝트 설정

---

## 변경사항 타입

- **Added**: 새로운 기능
- **Changed**: 기존 기능의 변경
- **Deprecated**: 곧 제거될 기능
- **Removed**: 제거된 기능
- **Fixed**: 버그 수정
- **Security**: 보안 관련 변경사항 