# TODO: Phase 3 완료 후 정리 작업

## 🚧 주석 처리된 기능들 (빌드 에러 해결을 위해 임시 비활성화)

### `src/routes/index.ts`에서 주석 처리된 라우팅들

#### 1. 설정 관리
```typescript
// router.get('/settings', getAllSettings); // TODO: 구현 필요
```
- **필요 작업**: `getAllSettings` 함수 구현
- **위치**: `src/controllers/configController.ts` 
- **우선순위**: 중간

#### 2. 인증 관련 라우팅
```typescript
// router.get('/auth/github', initiateGithubLogin); // TODO: 구현 필요
// router.post('/auth/logout', logout); // TODO: 구현 필요
```
- **필요 작업**: GitHub OAuth 로그인/로그아웃 구현
- **위치**: `src/controllers/authController.ts`
- **우선순위**: 낮음 (기본 MCPHub Key 인증 사용 중)

#### 3. OAuth 사용자 관리
```typescript
// router.get('/oauth/user', auth, getOAuthUser); // TODO: 구현 필요
// router.get('/oauth/keys', auth, getUserKeys); // TODO: 구현 필요
// router.post('/oauth/keys', auth, createUserKey); // TODO: 구현 필요
// router.get('/oauth/keys/:keyId/value', auth, getKeyValue); // TODO: 구현 필요
// router.get('/oauth/keys/:keyId/full-value', auth, getFullKeyValue); // TODO: 구현 필요
// router.get('/oauth/keys/:keyId/tokens', auth, getKeyTokens); // TODO: 구현 필요
// router.put('/oauth/keys/:keyId/tokens', auth, updateKeyTokens); // TODO: 구현 필요
// router.post('/oauth/keys/:keyId/extend', auth, extendKeyExpiry); // TODO: 구현 필요
// router.post('/oauth/keys/:keyId/deactivate', auth, deactivateKey); // TODO: 구현 필요
// router.delete('/oauth/keys/:keyId', auth, deleteUserKey); // TODO: 구현 필요
```
- **필요 작업**: OAuth 사용자 및 키 관리 시스템 구현
- **위치**: `src/controllers/oauthController.ts`
- **우선순위**: 낮음 (동적 MCP 서버 시스템으로 대체됨)

#### 4. 확장된 그룹 관리
```typescript
// router.get('/groups', getAllGroups); // TODO: 구현 필요
// router.put('/groups/:name', updateGroup); // TODO: 구현 필요
// router.post('/groups/:name/toggle', toggleGroup); // TODO: 구현 필요
```
- **필요 작업**: 확장된 그룹 관리 기능
- **위치**: `src/controllers/groupController.ts`
- **우선순위**: 중간

#### 5. 도구 실행
```typescript
// router.post('/tools/:serverName/:toolName', executeTool); // TODO: 구현 필요
```
- **필요 작업**: 동적 도구 실행 기능
- **위치**: `src/controllers/toolController.ts`
- **우선순위**: 높음

#### 6. 스마트 라우팅
```typescript
// router.post('/smart-routing/embed', embedTextForSmartRouting); // TODO: 구현 필요
// router.post('/smart-routing/search', searchServersForSmartRouting); // TODO: 구현 필요
// router.get('/smart-routing/servers', getAllServersForSmartRouting); // TODO: 구현 필요
```
- **필요 작업**: AI 기반 스마트 라우팅 시스템
- **위치**: `src/controllers/smartRoutingController.ts`
- **우선순위**: 중간

#### 7. API 키 관리 (동적 MCP 서버용)
```typescript
// router.get('/api-keys', getUserApiKeys); // TODO: 구현 필요
// router.post('/api-keys', setUserApiKey); // TODO: 구현 필요
// router.put('/api-keys/:serverName/:keyName', updateUserApiKey); // TODO: 구현 필요
// router.delete('/api-keys/:serverName/:keyName', deleteUserApiKey); // TODO: 구현 필요
```
- **필요 작업**: 기존 API 키 관리를 동적 MCP 서버 시스템에 통합
- **위치**: 이미 `src/controllers/mcpServerController.ts`에 구현됨
- **우선순위**: 높음 (라우팅만 활성화하면 됨)

#### 8. 로그 관리
```typescript
// router.get('/logs', getLogs); // TODO: 구현 필요
```
- **필요 작업**: `getLogs` 함수 구현
- **위치**: `src/controllers/logController.ts`
- **우선순위**: 중간

#### 9. 파일 업로드
```typescript
// router.post('/dxt/upload', upload.single('dxtFile'), uploadDxtFile); // TODO: 구현 필요
```
- **필요 작업**: `upload` 미들웨어 및 `uploadDxtFile` 구현
- **위치**: `src/controllers/dxtController.ts`
- **우선순위**: 낮음

#### 10. 헬스 체크
```typescript
// router.get('/health', getHealth); // TODO: 구현 필요
```
- **필요 작업**: `getHealth` 함수 구현
- **위치**: `src/controllers/healthController.ts`
- **우선순위**: 높음 (모니터링을 위해 필요)

### `src/routes/index.ts`에서 주석 처리된 import들

```typescript
// const userTokenController = new UserTokenController(); // TODO: implement when needed
```
- **필요 작업**: UserTokenController 구현 또는 제거
- **우선순위**: 낮음

## 🎯 Phase 4 우선순위 작업 계획

### 높음 (즉시 구현 필요)
1. **API 키 관리 라우팅 활성화** - 이미 구현된 기능 연결
2. **도구 실행 기능** - 동적 MCP 서버의 핵심 기능
3. **헬스 체크** - 시스템 모니터링

### 중간 (Phase 4 후반 구현)
1. **설정 관리 API** - 시스템 설정 조회/수정
2. **확장된 그룹 관리** - 그룹 생성/수정/삭제
3. **로그 관리** - 시스템 로그 조회
4. **스마트 라우팅** - AI 기반 서버 선택

### 낮음 (향후 버전에서 구현)
1. **GitHub OAuth** - 현재 MCPHub Key 인증으로 충분
2. **OAuth 사용자 관리** - 동적 서버 시스템으로 대체
3. **DXT 파일 업로드** - 특수 기능

## 📝 다음 단계

1. **현재 상태 테스트** - 동적 MCP 서버 관리 시스템 검증
2. **Phase 4 계획** - 우선순위 높은 기능들 구현
3. **코드 정리** - 주석 처리된 부분들 체계적 복원
4. **문서화** - API 문서 및 사용법 가이드 작성

## 🔄 복원 시 주의사항

- **의존성 확인**: 각 함수가 의존하는 다른 함수들 구현 상태 확인
- **타입 정의**: TypeScript 타입 정의 누락 여부 확인  
- **테스트**: 복원한 기능별로 단위 테스트 실행
- **문서 업데이트**: API 문서 및 README 업데이트 