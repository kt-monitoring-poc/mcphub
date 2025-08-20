# 사내 배포 MCP 서버를 IDE/AI Agent에서 직접 사용할 때의 보안 가이드 (MCPHub 없이)

> 🎯 핵심 목표: 내부망(VPN/제로트러스트)에서 운영되는 MCP 서버들을 Cursor/IDE/AI Agent가 직접 사용할 때 발생 가능한 위협과 필수 방어 통제 정리

## 📋 전제 조건
- MCP 서버들은 사내 네트워크 혹은 전용 VNet/서브넷에 배포됨
- 외부에서는 직접 접근 불가, VPN/MESA/제로트러스트 프록시 통과 시에만 접근 가능
- IDE/AI Agent(예: Cursor, VS Code, Notebook 등)는 개발자 단말에서 실행됨
- 중앙 허브(MCPHub) 없이 Agent → MCP 서버로 직접 연결

## ⚠️ 위협 시나리오 및 완화책

### 1) 자격증명(Secrets) 유출/오용
- **위협**: IDE 플러그인이 평문으로 토큰을 보관/전송, Git 기록/로그에 노출, 맬웨어 IDE 확장에 탈취
- **완화책**:
  - **mTLS + 짧은 수명 토큰(STS)**: 서버는 클라이언트 인증서 요구, 토큰은 1~24h 단위 회전
  - **Secrets Manager 연동**: 서버 측에서만 비밀 조회, 클라이언트는 스코프 한정 토큰만 보유
  - **토큰 스코프 최소화**: 서버·툴 단위 세분화 권한, 읽기 전용 우선
  - **로그 마스킹**: `src/services/mcpService.ts` 라인 598-603, 974-996의 로깅 경계 준수(민감정보 마스킹)

### 2) 내부 자원 남용/권한 상승
- **위협**: IDE가 노출된 내부 API/DB에 과도한 권한으로 접근, lateral movement
- **완화책**:
  - **네트워크 세분화**: 서버별 서브넷/NSG, East-West 트래픽 최소화
  - **RBAC/ABAC**: 서비스·사용자·그룹별 권한 최소화. 그룹 기반 필터링은 `mcpService.ts` 라인 1438-1477 참고
  - **정책 엔진(Opa/Casbin)**: 툴/리소스/액션 단위 정책 적용

### 3) 데이터 유출(DLP)
- **위협**: 소스코드/DB 덤프를 외부로 전송하는 툴 사용
- **완화책**:
  - **egress 프록시**: 외부로 나가는 HTTP/SSH 제한·로깅
  - **컨텐츠 필터링**: 파일·레코드 크기 상한, PII/비밀 탐지 후 차단
  - **감사 로깅**: 요청/응답 요약을 안전하게 저장(민감값 해시) → `requestId`/업스트림 컨텍스트 패턴 참조: `mcpService.ts` 1519-1553, 1779-1807

### 4) 공급망(플러그인) 위험
- **위협**: 악성 IDE 확장, 서드파티 MCP 서버 이미지 변조
- **완화책**:
  - **허용 목록**: 승인된 IDE 확장·버전만 사용
  - **이미지 서명/스캔**: Cosign/Trivy로 컨테이너 서명·취약점 스캔
  - **SBOM 관리**: 주기적 갱신 및 차이 감시

### 5) 세션/연결 하이재킹
- **위협**: 에이전트↔서버 통신 가로채기, 세션 재사용
- **완화책**:
  - **VPN/제로트러스트** 필수. Ingress는 내부 전용, 공인 IP 미노출
  - **TLS1.2+ & mTLS**: 클라이언트 증명서로 단말 식별
  - **요청 추적 ID**: `DebugLogger`/`upstreamContext` 패턴으로 상호 대조(`src/server.ts` 107-128, `mcpService.ts` 212-236, 1519-1553)

## 🔐 권장 아키텍처 (허브 없이 직접 연결)
- 네트워크: IDE → VPN/ZeroTrust → WAF/Reverse Proxy → MCP 서버(VNet)
- 인증: mTLS(+ 짧은 수명 토큰), IP/디바이스 조건부 접근
- 권한: 서버/툴 단위 RBAC, 그룹 기반 필터링(참조 코드: `mcpService.ts` 1438-1477)
- 로깅: 중앙 감사(요청ID, 사용자, 툴, 결과 코드/용량), 민감값 마스킹
- 옵저버빌리티: OTLP 수집기(Collector)로 로그/트레이스 전송(이미 적용)

## ✅ 운영 체크리스트
- 네트워크
  - [ ] 공인 노출 차단, 사설 DNS만 노출
  - [ ] Ingress는 사내 CA TLS, mTLS 강제
- 인증/권한
  - [ ] VPN/제로트러스트 게이트웨이 필수
  - [ ] 단말/사용자/위치 기반 정책
  - [ ] 토큰 수명·스코프 최소화, 키 로테이션 자동화
- 서버 설정
  - [ ] 환경변수는 템플릿/비밀관리 사용 (`${USER_*}` 패턴 참고: `src/utils/variableDetection.ts` 83-116)
  - [ ] 로깅 마스킹·디버그 최소화(프로덕션)
- 감사/모니터링
  - [ ] 요청 추적·감사 저장소 분리
  - [ ] DLP 룰/egress 모니터링

## 📌 최소 구성 예시 (K8s)
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/auth-tls-verify-client: "on"  # mTLS
spec:
  tls:
    - hosts: ["mcp.internal.company"]
      secretName: mcp-tls
  rules:
    - host: mcp.internal.company
      http:
        paths:
          - path: /mcp
            pathType: Prefix
            backend:
              service:
                name: mcp-server
                port:
                  number: 443
```

## 🔎 감사 포인트(코드 기준)
- `src/server.ts` 107-128: 요청 컨텍스트 생성 및 응답 로깅 훅
- `src/services/mcpService.ts` 212-236: 업스트림 헤더 생성(사용자·세션·요청ID)
- `src/services/mcpService.ts` 1519-1553, 1779-1807: 툴 호출 로깅/응답 메타 기록
- `src/utils/variableDetection.ts` 83-116: 사용자별 비밀 키 템플릿 추출

## 🧭 결론
- MCPHub 없이도 내부망+VPN+mTLS+RBAC(+DLP) 조합으로 안전하게 IDE/Agent에서 MCP 서버 사용 가능
- 단, 중앙 정책/관찰성·감사·그룹 필터링 기능은 MCPHub가 더 강력. 규모가 커지면 허브 도입을 권고
