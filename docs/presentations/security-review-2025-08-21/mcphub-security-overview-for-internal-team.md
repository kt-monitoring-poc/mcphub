# MCPHub 보안 아키텍처 및 통제 사항 - 사내 보안팀 검토용

> 작성일: 2025-08-21  
> 문서 버전: 1.0  
> 프로젝트: MCPHub v3.0

## 1. 개요 (Executive Summary)

### 1.1 MCPHub란?
MCPHub는 다양한 MCP(Model Context Protocol) 서버들을 중앙에서 관리하고, 사용자별 API 키를 동적으로 주입하여 안전하게 연결해주는 통합 허브 플랫폼입니다.

### 1.2 보안 관점의 핵심 기능
- **중앙집중식 인증/인가**: 개별 MCP 서버 접근 권한을 중앙에서 통제
- **API 키 관리**: 민감한 API 키들을 안전하게 저장하고 필요시에만 주입
- **감사 로깅**: 모든 API 호출 및 툴 사용 이력 추적
- **네트워크 격리**: 내부 MCP 서버들을 직접 노출하지 않고 프록시 역할

## 2. 보안 아키텍처

### 2.1 시스템 구성도
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   IDE/Client    │────▶│    MCPHub       │────▶│  MCP Servers    │
│  (Cursor, VS)   │     │   (Gateway)     │     │  (Internal)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                        │
         │ HTTPS/TLS            │ mTLS/VPN              │ Internal Network
         │ JWT/API Key          │ Service Tokens        │ Isolated Subnet
         ▼                       ▼                        ▼
    [Public Zone]          [DMZ Zone]              [Private Zone]
```

### 2.2 주요 보안 레이어
1. **인증 계층**: JWT, OAuth 2.0 (GitHub), API Key
2. **인가 계층**: RBAC, 그룹 기반 접근 제어
3. **네트워크 계층**: TLS 1.2+, mTLS (옵션), VPN/Zero Trust
4. **데이터 계층**: AES-256 암호화, PostgreSQL Row-Level Security

## 3. 인증 및 인가 체계

### 3.1 인증 방식
#### 3.1.1 사용자 인증
- **GitHub OAuth 2.0**: 외부 사용자용 (SSO)
- **로컬 계정**: 관리자용 (bcrypt 해시, salt rounds: 10)
- **JWT 토큰**: 세션 관리 (기본 만료: 24시간)

#### 3.1.2 API 인증
- **MCPHub API Key**: 프로그래매틱 접근용
  - UUID v4 기반 생성
  - 만료 기간 설정 가능 (기본: 30일)
  - 사용 횟수 추적 및 제한 가능

### 3.2 인가 체계
#### 3.2.1 역할 기반 접근 제어 (RBAC)
```typescript
// src/db/entities/User.ts
enum UserRole {
  ADMIN = 'admin',      // 전체 시스템 관리
  MANAGER = 'manager',  // 그룹 및 서버 관리
  USER = 'user',        // 할당된 리소스 사용
  VIEWER = 'viewer'     // 읽기 전용 접근
}
```

#### 3.2.2 그룹 기반 접근 제어
- 사용자는 여러 그룹에 속할 수 있음
- 그룹별로 접근 가능한 MCP 서버 목록 제한
- 세밀한 권한 설정 (서버별 read/write/execute)

## 4. 데이터 보호

### 4.1 저장 데이터 암호화 (Encryption at Rest)
#### 4.1.1 API 키/토큰 암호화
```typescript
// src/services/dynamicMcpService.ts (라인 41-51)
private encryptToken(token: string): string {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32));
  const iv = randomBytes(16);
  
  const cipher = createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}
```

#### 4.1.2 데이터베이스 레벨 보호
- PostgreSQL 네이티브 암호화 (TDE 권장)
- 민감한 필드 컬럼 레벨 암호화
- 백업 데이터 암호화

### 4.2 전송 데이터 암호화 (Encryption in Transit)
- **외부 통신**: TLS 1.2+ 강제 (HSTS 헤더 적용)
- **내부 통신**: mTLS 또는 VPN 터널링
- **WebSocket**: WSS (WebSocket Secure) 사용

### 4.3 로그 데이터 마스킹
```typescript
// src/services/mcpService.ts (라인 598-603, 974-996)
// 민감한 정보 자동 마스킹 처리
const maskedHeaders = {
  ...headers,
  'Authorization': '[REDACTED]',
  'x-api-key': '[REDACTED]',
  'x-github-token': '[REDACTED]'
};
```

## 5. 네트워크 보안

### 5.1 네트워크 아키텍처
```yaml
# Kubernetes Ingress 설정 예시
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/auth-tls-verify-client: "on"  # mTLS
spec:
  tls:
    - hosts: ["mcphub.internal.company"]
      secretName: mcphub-tls
```

### 5.2 접근 통제
- **IP 화이트리스트**: 사내 IP 대역만 허용
- **Rate Limiting**: API 엔드포인트별 요청 제한
- **DDoS 방어**: CloudFlare/AWS Shield 활용

### 5.3 세분화된 네트워크 격리
- **DMZ**: MCPHub 서버 배치
- **Private Subnet**: MCP 서버들 배치
- **East-West 트래픽**: 최소화 및 모니터링

## 6. 보안 모니터링 및 감사

### 6.1 로깅 체계
#### 6.1.1 감사 로그 항목
- 인증 시도 (성공/실패)
- API 호출 (endpoint, user, timestamp)
- 권한 변경 이력
- 민감한 작업 (키 생성/삭제, 사용자 권한 변경)

#### 6.1.2 OpenTelemetry 통합
```typescript
// src/config/otel-logger-adapter.ts
// 모든 로그에 trace context 자동 주입
const traceContext = {
  traceId: spanContext.traceId,
  spanId: spanContext.spanId,
  userId: user.id,
  requestId: req.requestId
};
```

### 6.2 실시간 모니터링
- **이상 행위 탐지**: 비정상적인 API 호출 패턴
- **권한 상승 시도**: 미인가 리소스 접근 시도
- **대량 데이터 유출**: 비정상적인 응답 크기

## 7. 취약점 관리

### 7.1 의존성 관리
- **정기 스캔**: Dependabot, Snyk 활용
- **CVE 모니터링**: 크리티컬 취약점 즉시 패치
- **SBOM 관리**: 모든 의존성 버전 추적

### 7.2 코드 보안
- **SAST**: SonarQube 정적 분석
- **Secret 스캔**: GitHub Secret Scanning
- **코드 리뷰**: PR 시 보안 검토 필수

## 8. 컴플라이언스 준수 사항

### 8.1 데이터 프라이버시
- **개인정보 최소화**: 필요한 정보만 수집
- **데이터 보존 정책**: 90일 후 자동 삭제
- **접근 로그**: 6개월 보관

### 8.2 보안 표준 준수
- **OWASP Top 10**: 주요 취약점 대응
- **CIS Benchmarks**: 인프라 보안 설정
- **ISO 27001**: 정보보안 관리체계 준수

## 9. 사고 대응 계획

### 9.1 보안 사고 대응 절차
1. **탐지**: 자동 알림 및 모니터링
2. **격리**: 영향받은 시스템 즉시 차단
3. **분석**: 로그 분석 및 영향도 평가
4. **복구**: 백업에서 복원 및 패치 적용
5. **사후 분석**: 원인 분석 및 재발 방지

### 9.2 비상 연락망
- 보안팀: security@company.com
- 인프라팀: infra@company.com
- 개발팀: mcphub-dev@company.com

## 10. 보안 권고사항

### 10.1 즉시 적용 권장
1. **mTLS 활성화**: 모든 내부 통신에 상호 TLS 인증
2. **API Key 로테이션**: 30일 주기 자동 갱신
3. **최소 권한 원칙**: 기본값을 제한적으로 설정

### 10.2 중장기 개선사항
1. **Zero Trust 아키텍처**: 모든 요청을 검증
2. **동적 비밀 관리**: HashiCorp Vault 통합
3. **행위 기반 탐지**: ML 기반 이상 탐지

## 11. 보안 체크리스트

### 11.1 배포 전 확인사항
- [ ] 모든 환경변수 암호화 여부
- [ ] TLS 인증서 유효성
- [ ] 방화벽 규칙 최소화
- [ ] 관리자 계정 2FA 활성화
- [ ] 백업 및 복구 절차 테스트

### 11.2 운영 중 정기 점검
- [ ] 월간 취약점 스캔
- [ ] 분기별 침투 테스트
- [ ] 반기별 보안 감사
- [ ] 연간 DR 훈련

## 12. 연락처 및 참고자료

### 12.1 프로젝트 담당자
- 개발 리드: [개발자명] (dev-lead@company.com)
- 보안 담당: [보안담당자명] (security-lead@company.com)

### 12.2 참고 문서
- [MCPHub 아키텍처 문서](./architecture.mdx)
- [API 보안 가이드](./api-security-guide.md)
- [인시던트 대응 매뉴얼](./incident-response.md)

---

**문서 검토 및 승인**
- 작성자: MCPHub 개발팀
- 검토자: 사내 보안팀
- 승인자: CISO
- 다음 검토일: 2025-04-20
