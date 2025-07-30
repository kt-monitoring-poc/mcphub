# MCPHub 프로젝트 현황 통합 문서

## 📋 프로젝트 개요

MCPHub는 Model Context Protocol (MCP) 서버들을 중앙 집중식으로 관리하는 허브 플랫폼입니다. 사용자들이 다양한 MCP 서버에 접근할 수 있도록 하는 통합 게이트웨이 역할을 합니다.

## 🎯 핵심 완성 기능

### ✅ **환경변수 자동화 시스템 (2025-07-30 완성)**

**완전 자동화된 MCP 서버 환경변수 관리**:
- 새 MCP 서버 추가 시 코드 수정 불필요
- 환경변수 입력 필드 자동 생성
- 기존 토큰 값 자동 로드 및 표시
- 동적 서버 매핑으로 무한 확장 가능

**자동화 플로우**:
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

### ✅ **사용자 인증 시스템**
- GitHub OAuth 통합
- JWT 기반 세션 관리
- 관리자/일반 사용자 권한 구분
- 자동 사용자 정보 동기화

### ✅ **MCP 서버 관리**
- `mcp_settings.json` 직접 편집 UI
- 서버 상태 모니터링
- 동적 서버 연결/해제
- 에러 처리 및 로깅

### ✅ **데이터베이스 시스템**
- PostgreSQL + TypeORM
- 벡터 검색 지원 (pgvector)
- 사용자별 API 키 암호화 저장
- 자동 스키마 동기화

## 🏗 시스템 아키텍처

### 백엔드 구조
```
src/
├── controllers/     # API 컨트롤러
├── routes/         # API 라우팅
├── services/       # 비즈니스 로직
├── middlewares/    # 인증/권한 미들웨어
├── utils/          # 환경변수 감지 등 유틸리티
├── db/            # 데이터베이스 엔티티/리포지토리
└── config/        # 설정 관리
```

### 프론트엔드 구조
```
frontend/src/
├── pages/         # 페이지 컴포넌트
├── components/    # 재사용 컴포넌트
├── contexts/      # React Context (인증, 테마, 토스트)
├── hooks/         # 커스텀 훅
├── services/      # API 통신
└── utils/         # 유틸리티 함수
```

## 📊 핵심 데이터 구조

### 1. mcp_settings.json (서버 설정)
```json
{
  "mcpServers": {
    "firecrawl-mcp": {
      "type": "sse",
      "url": "http://localhost:8080/sse",
      "env": {
        "USER_FIRECRAWL_TOKEN": "템플릿값"
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

### 2. 데이터베이스 스키마
- **users**: GitHub OAuth 사용자 정보
- **mcphub_keys**: 사용자별 API 키 저장 (serviceTokens JSONB)
- **user_tokens**: 인증 토큰 관리
- **vector_embeddings**: 도구 검색용 벡터 임베딩

## 🔧 주요 API 엔드포인트

### 환경변수 관리
- `GET /api/env-templates` - 서버별 환경변수 템플릿 조회
- `GET /api/user-env-vars` - 사용자 환경변수 조회
- `POST /api/user-env-vars` - 사용자 환경변수 저장

### 서버 관리  
- `GET /api/servers` - MCP 서버 목록 조회
- `GET /api/admin/settings-file` - mcp_settings.json 조회
- `PUT /api/admin/settings-file` - mcp_settings.json 수정

### 인증
- `GET /api/oauth/github` - GitHub OAuth 로그인
- `GET /api/oauth/callback` - OAuth 콜백 처리
- `GET /api/user/me` - 현재 사용자 정보

## 🎨 UI/UX 특징

### 설정 페이지
- 서버별 환경변수 그룹화
- 접을 수 있는 섹션 UI
- 비밀번호 필드 토글
- 실시간 저장 피드백

### 관리자 페이지
- JSON 직접 편집 인터페이스
- 서버 상태 모니터링
- 사용자 관리
- 시스템 로그 뷰어

## 🔒 보안 고려사항

1. **API 키 보호**
   - 암호화된 DB 저장
   - 사용자별 격리
   - 프론트엔드에서 마스킹 처리

2. **인증/권한**
   - JWT 토큰 기반 인증
   - 관리자 권한 분리
   - API 엔드포인트 보호

3. **로깅 보안**
   - 민감한 정보 로그 제외
   - 프로덕션에서 디버그 로그 비활성화

## 🚀 확장성

### 새 MCP 서버 추가 과정
1. 개발팀이 MCP 서버 개발 완료
2. JSON 스펙을 관리자에게 전달
3. 관리자가 mcp_settings.json에 추가
4. 자동으로 모든 사용자에게 환경변수 입력 필드 생성
5. 사용자들이 각자 API 키 입력 후 사용

### 무한 확장 가능
- 서버 수량 제한 없음
- 환경변수 수량 제한 없음
- 코드 수정 불필요
- 실시간 적용

## 📈 성능 최적화

1. **벡터 검색**: IVFFlat 인덱스로 도구 검색 최적화
2. **API 최적화**: 필요한 데이터만 조회/전송
3. **프론트엔드**: React 최적화 기법 적용
4. **데이터베이스**: 적절한 인덱스 설정

## 🛠 개발 환경

### 기술 스택
- **백엔드**: Node.js, TypeScript, Express, TypeORM
- **프론트엔드**: React, TypeScript, Vite, Tailwind CSS
- **데이터베이스**: PostgreSQL + pgvector
- **인증**: GitHub OAuth, JWT
- **배포**: Docker, Docker Compose

### 개발 도구
- **코드 품질**: ESLint, Prettier
- **테스트**: Jest
- **번들링**: Vite (프론트엔드), tsc (백엔드)
- **패키지 관리**: pnpm

## 🐛 해결된 주요 이슈들

### 1. 환경변수 이름 불일치 (2025-07-30)
- **문제**: 템플릿 `USER_FIRECRAWL_TOKEN` vs 실제 `FIRECRAWL_TOKEN`
- **해결**: 자동 변환 로직 구현

### 2. TypeORM 엔티티 충돌
- **문제**: user_api_keys 테이블 스키마 불일치
- **해결**: 테이블 제거, mcphub_keys.serviceTokens 통합

### 3. 하드코딩된 서버 매핑
- **문제**: 새 서버 추가 시 코드 수정 필요
- **해결**: envVarConfigs 기반 동적 매핑

## 📝 앞으로 할 일

### 우선순위 높음
- [ ] 프로덕션 환경 디버그 로그 정리
- [ ] 성능 모니터링 시스템 구축
- [ ] 에러 처리 개선

### 우선순위 중간
- [ ] 사용자 대시보드 개선
- [ ] MCP 서버 통계/분석 기능
- [ ] API 속도 제한(Rate Limiting)

### 우선순위 낮음
- [ ] 다국어 지원 확장
- [ ] 테마 커스터마이징
- [ ] 고급 권한 관리

## 📋 현재 상태 요약

### ✅ 완료된 기능들
- 환경변수 자동화 시스템 (100% 완성)
- GitHub OAuth 인증 (100% 완성)
- MCP 서버 관리 UI (100% 완성)
- 데이터베이스 스키마 (100% 완성)
- 관리자/사용자 권한 분리 (100% 완성)

### 🔧 진행 중
- 디버그 로그 정리 (진행 중)
- 성능 최적화 (진행 중)

### 📊 시스템 상태
- **안정성**: 높음 (모든 핵심 기능 정상 작동)
- **확장성**: 매우 높음 (무코딩 확장 지원)
- **보안**: 높음 (OAuth + JWT + 암호화)
- **성능**: 양호 (추가 최적화 여지 있음)

---

**최종 업데이트**: 2025-07-30  
**작성자**: MCPHub 개발팀  
**문서 버전**: 2.0.0 