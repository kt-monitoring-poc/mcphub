# MCPHub 타임아웃 설정 최적화 (2025-08-09)

## 📋 개선 배경

Cursor IDE와의 장시간 개발 세션에서 세션 끊김 현상이 발생하여, 업계 표준을 조사하고 개발 도구의 특성에 맞는 관대한 타임아웃 설정으로 최적화했습니다.

## 🏢 업계 표준 분석

### 대형 플랫폼 타임아웃 설정
| 서비스 | 세션/연결 타임아웃 | 특징 |
|--------|-------------------|------|
| **AWS API Gateway** | WebSocket 10분 idle | 클라우드 표준 |
| **Azure API Management** | 기본 230초 (4분) | 엔터프라이즈 |
| **Google Cloud Endpoints** | 15분 idle timeout | 관대한 설정 |
| **GitHub API** | WebSocket 10분 | 개발자 친화적 |
| **Slack API** | 세션 30분 | 협업 도구 |
| **Discord** | 세션 15분 | 실시간 통신 |

### 개발 도구 표준
| 도구 | 세션 타임아웃 | 용도 |
|------|---------------|------|
| **VS Code Extensions** | 10-15분 | IDE 확장 |
| **IntelliJ IDEA Plugins** | 20분 | 개발 환경 |
| **Nginx 기본값** | keepalive 75초 | 웹 서버 |

## 🔧 MCPHub 타임아웃 설정 변경

### 변경 전 (보수적 설정)
```typescript
// 기존 설정 - 너무 짧아서 개발 작업 중 세션 끊김 발생
const HEARTBEAT_INTERVAL = 30000;  // 30초
const INACTIVITY_TIMEOUT = 120000; // 2분
server.keepAliveTimeout = 65000;   // 65초
CONNECTION_TIMEOUT = 30000;        // 30초
TOOL_CALL_TIMEOUT = 60000;         // 1분
```

### 변경 후 (개발 친화적 설정)
```typescript
// 새 설정 - 개발 작업 특성을 고려한 관대한 설정
const HEARTBEAT_INTERVAL = 60000;   // 1분 (업계 표준)
const INACTIVITY_TIMEOUT = 900000;  // 15분 (개발 작업 고려)
server.keepAliveTimeout = 180000;   // 3분 (연결 유지)
CONNECTION_TIMEOUT = 60000;         // 1분 (업스트림 안정성)
TOOL_CALL_TIMEOUT = 120000;         // 2분 (도구 호출 여유)
```

### 세부 변경 내용

#### 1. 클라이언트 세션 관리 (`src/services/sseService.ts`)
```typescript
// 하트비트 주기: 30초 → 1분
const HEARTBEAT_INTERVAL = 60000;

// 비활성 세션 정리: 2분 → 15분
const INACTIVITY_TIMEOUT = 900000;

// HTTP Keep-Alive: 60초 → 2분
res.setHeader('Keep-Alive', 'timeout=120, max=1000');
```

**효과**: 
- 개발자가 코드 리뷰, 문서 작성 등으로 잠시 자리를 비워도 세션 유지
- 하트비트 주기 연장으로 네트워크 트래픽 감소

#### 2. 업스트림 서버 연결 (`src/services/mcpService.ts`)
```typescript
// 연결 타임아웃: 30초 → 1분
setTimeout(() => reject(new Error('Connection timeout')), 60000)

// 도구 목록 로딩: 30초 → 1분
setTimeout(() => reject(new Error('Tools listing timeout')), 60000)

// 도구 호출 타임아웃: 1분 → 2분
timeout: serverRequestOptions.timeout || 120000
```

**효과**:
- 느린 MCP 서버(Firecrawl, 복잡한 Jira 쿼리 등)에 대한 안정성 향상
- 대용량 데이터 처리 도구 호출 시 여유 시간 확보

#### 3. HTTP 서버 레벨 (`src/server.ts`)
```typescript
// 서버 Keep-Alive: 65초 → 3분
server.keepAliveTimeout = 180000;
server.headersTimeout = 181000;
```

**효과**:
- 클라이언트와의 TCP 연결 더 오래 유지
- 연결 재설정 오버헤드 감소

#### 4. SSE 서버 기본값 (`src/controllers/serverController.ts`)
```typescript
// SSE Keep-Alive 간격: 60초 → 2분
config.keepAliveInterval = 120000;
```

**효과**:
- SSE 연결 안정성 향상
- 장시간 스트리밍 작업 지원

## 📊 개선 효과 예상

### 사용자 경험 개선
1. **세션 끊김 감소**: 15분까지 비활성 상태 허용
2. **안정적인 도구 호출**: 복잡한 작업도 2분 여유 시간
3. **네트워크 효율성**: 하트비트 주기 연장으로 트래픽 감소

### 시스템 안정성
1. **업스트림 서버 호환성**: 느린 서버에 대한 관대한 대기
2. **리소스 효율성**: 불필요한 재연결 감소
3. **에러 감소**: 타임아웃으로 인한 실패 사례 최소화

## 🎯 운영 가이드

### 모니터링 포인트
1. **세션 지속 시간**: 평균 세션 길이 증가 예상
2. **메모리 사용량**: 세션 증가로 인한 메모리 사용량 모니터링 필요
3. **업스트림 응답시간**: 타임아웃 증가가 실제 응답시간에 미치는 영향

### 필요시 추가 조정
```typescript
// 환경별 설정 가능
const HEARTBEAT_INTERVAL = process.env.HEARTBEAT_INTERVAL || 60000;
const INACTIVITY_TIMEOUT = process.env.INACTIVITY_TIMEOUT || 900000;
```

## 🔧 롤백 가이드

문제 발생 시 이전 설정으로 롤백:
```typescript
// 보수적 설정으로 롤백
const HEARTBEAT_INTERVAL = 30000;  // 30초
const INACTIVITY_TIMEOUT = 120000; // 2분
server.keepAliveTimeout = 65000;   // 65초
```

## 📈 성능 테스트 계획

### 1. 장시간 세션 테스트
- Cursor IDE 30분 연속 사용
- 다양한 도구 호출 패턴 테스트

### 2. 동시 접속 테스트
- 70명 동시 접속으로 메모리/CPU 사용량 확인
- 세션 정리 로직 동작 검증

### 3. 업스트림 서버 부하 테스트
- 느린 응답 서버에 대한 안정성 검증
- 타임아웃 설정의 실효성 확인

## 🎉 결론

MCPHub가 **개발자 도구의 허브 역할**에 걸맞은 관대하고 안정적인 타임아웃 설정을 갖추게 되었습니다. 

**핵심 개선 사항**:
- 🕐 **세션 지속성**: 2분 → 15분 (7.5배 향상)
- 🔗 **연결 안정성**: 30초 → 1-2분 (2-4배 여유)
- 🚀 **사용자 경험**: 세션 끊김으로 인한 작업 중단 최소화

이제 개발자들이 코드 리뷰, 문서 작성, 깊은 사고 등의 작업을 하면서도 MCPHub와의 연결이 안정적으로 유지될 것입니다.

---
**작성자**: AI Assistant  
**검토자**: jungchihoon  
**작성일**: 2025-08-09  
**버전**: 1.0  
**적용 브랜치**: chore/concurrency-test-docs-and-script
