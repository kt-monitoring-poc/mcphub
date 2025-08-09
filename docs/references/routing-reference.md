# MCPHub 라우팅 참조 문서

## 개요
이 문서는 MCPHub의 라우팅 구조와 API 엔드포인트를 정리한 참조 문서입니다.

## 주요 라우팅 구조

### 1. 프론트엔드 라우팅
**파일**: `frontend/src/App.tsx`

```
/                    → Dashboard
/login              → LoginPage
/settings           → SettingsPage
/servers            → ServersPage
/groups             → GroupsPage
/logs               → LogsPage
/market             → MarketPage
/admin/*            → 관리자 페이지들
```

### 2. 백엔드 API 라우팅
**파일**: `src/routes/index.ts`

#### 인증 관련
```
POST /api/auth/login          → 로그인
POST /api/auth/logout         → 로그아웃
GET  /api/auth/me             → 현재 사용자 정보
GET  /api/oauth/github        → GitHub OAuth
GET  /api/oauth/github/callback → GitHub OAuth 콜백
```

#### MCP 서버 관리
```
GET    /api/servers                    → 서버 목록 조회
POST   /api/servers                    → 서버 추가
PUT    /api/servers/:name              → 서버 수정
DELETE /api/servers/:name              → 서버 삭제
POST   /api/servers/:name/toggle       → 서버 활성화/비활성화
```

#### 환경변수 관리
```
GET  /api/env-templates                → 환경변수 템플릿 조회
GET  /api/user-env-vars                → 사용자 환경변수 조회
POST /api/user-env-vars                → 사용자 환경변수 저장
```

#### 관리자 전용
```
GET  /api/admin/stats                  → 시스템 통계
GET  /api/admin/users                  → 사용자 목록
GET  /api/admin/activities             → 활동 로그
GET  /api/admin/user-keys              → 사용자 키 관리
```

#### 그룹 관리
```
GET    /api/groups                     → 그룹 목록
GET    /api/groups/:name               → 그룹 상세
POST   /api/groups                     → 그룹 생성
PUT    /api/groups/:name               → 그룹 수정
DELETE /api/groups/:name               → 그룹 삭제
```

#### 도구 관리
```
GET    /api/tools                      → 도구 목록
POST   /api/servers/:serverName/tools/:toolName/toggle → 도구 활성화/비활성화
PUT    /api/servers/:serverName/tools/:toolName/description → 도구 설명 수정
```

#### 시스템 모니터링
```
GET  /api/health                       → 헬스 체크
GET  /api/config/runtime               → 런타임 설정
GET  /api/logs/stream                  → 로그 스트림 (SSE)
```

#### 마켓플레이스
```
GET  /api/market                       → 마켓 서버 목록
GET  /api/market/categories            → 카테고리 목록
GET  /api/market/tags                  → 태그 목록
```

## 미들웨어 구조

### 인증 미들웨어
**파일**: `src/middlewares/auth.ts`

```typescript
requireAuth    → JWT 토큰 검증
requireAdmin   → 관리자 권한 검증
```

### 라우팅 미들웨어 순서
**파일**: `src/server.ts`

1. 정적 파일 서빙
2. CORS 설정
3. JSON 파싱
4. 세션 설정
5. Passport 초기화
6. API 라우트 등록
7. 프론트엔드 서빙

## 환경변수 템플릿 시스템

### 템플릿 감지
**파일**: `src/utils/variableDetection.ts`

```typescript
detectVariables()      → 모든 변수 감지
extractUserEnvVars()   → USER_ 접두사 변수만 추출
replaceEnvVars()       → 환경변수 치환
```

### 사용 패턴
```json
{
  "headers": {
    "Authorization": "Bearer ${USER_GITHUB_TOKEN}",
    "JIRA_BASE_URL": "${USER_JIRA_BASE_URL}"
  }
}
```

## 데이터베이스 라우팅

### TypeORM 엔티티
**파일**: `src/db/entities/`

```
User.ts                    → 사용자 정보
McpServer.ts              → MCP 서버 정보
McpServerEnvironmentVariable.ts → 환경변수 정보
UserApiKey.ts             → 사용자 API 키
McphubKey.ts              → MCPHub 키
UserToken.ts              → 사용자 토큰
VectorEmbedding.ts        → 벡터 임베딩
```

## 보안 고려사항

### JWT 토큰
- **발급**: 로그인 시
- **검증**: 모든 보호된 라우트에서
- **만료**: 설정 가능한 만료 시간

### API 키 암호화
- **알고리즘**: AES-256-CBC
- **키 유도**: crypto.scryptSync 사용
- **저장**: 암호화된 형태로 DB 저장

## 오류 처리

### HTTP 상태 코드
```
200 → 성공
201 → 생성됨
400 → 잘못된 요청
401 → 인증 실패
403 → 권한 없음
404 → 리소스 없음
500 → 서버 오류
```

### 응답 형식
```json
{
  "success": boolean,
  "data": any,
  "message": string
}
```

## 개발 가이드

### 새 라우트 추가 시
1. `src/routes/index.ts`에 라우트 정의
2. `src/controllers/`에 컨트롤러 함수 작성
3. 필요한 미들웨어 적용
4. 프론트엔드에서 API 호출 구현

### 환경변수 추가 시
1. `mcp_settings.json`에 `${USER_VAR_NAME}` 패턴 사용
2. `src/utils/variableDetection.ts`에서 자동 감지
3. 프론트엔드 설정 페이지에 자동 생성

## 참조 파일 목록

### 백엔드
- `src/routes/index.ts` - 메인 라우팅
- `src/middlewares/auth.ts` - 인증 미들웨어
- `src/controllers/` - 컨트롤러들
- `src/utils/variableDetection.ts` - 환경변수 처리

### 프론트엔드
- `frontend/src/App.tsx` - 라우터 설정
- `frontend/src/pages/` - 페이지 컴포넌트들
- `frontend/src/services/` - API 서비스들

### 설정
- `mcp_settings.json` - MCP 서버 설정
- `src/config/index.ts` - 설정 로딩/저장 