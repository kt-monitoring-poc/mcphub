# MCPHub 보안 체크리스트 - Quick Reference

> 🚨 보안팀 빠른 검토용 체크리스트

## 🔐 인증/인가
- [ ] **패스워드**: bcrypt (salt rounds: 10)
- [ ] **JWT**: HS256, 24시간 만료
- [ ] **API Key**: UUID v4 + 타임스탬프, 30일 기본 만료
- [ ] **OAuth**: GitHub OAuth 2.0 지원
- [ ] **2FA**: 관리자 계정 필수 (계획 중)
- [ ] **세션**: Redis 저장, 24시간 TTL

## 🔒 데이터 보호
- [ ] **API 토큰 암호화**: AES-256-CBC
- [ ] **DB 연결**: TLS/SSL 필수
- [ ] **백업 암호화**: 전체 백업 파일 암호화
- [ ] **로그 마스킹**: 민감정보 자동 제거
- [ ] **전송 암호화**: TLS 1.2+ only

## 🌐 네트워크 보안
- [ ] **HTTPS 강제**: HSTS 헤더 적용
- [ ] **CORS**: 화이트리스트 기반
- [ ] **Rate Limiting**: API별 차등 적용
- [ ] **IP 화이트리스트**: 프로덕션 환경
- [ ] **mTLS**: 내부 서비스 간 통신 (옵션)

## 🛡️ 애플리케이션 보안
- [ ] **SQL Injection**: TypeORM 파라미터 바인딩
- [ ] **XSS**: DOMPurify 적용
- [ ] **CSRF**: 토큰 기반 방어
- [ ] **보안 헤더**: Helmet.js 적용
- [ ] **입력 검증**: express-validator

## 📊 모니터링/로깅
- [ ] **감사 로그**: 모든 인증/인가 이벤트
- [ ] **보안 알림**: 실시간 이상 탐지
- [ ] **OpenTelemetry**: 분산 추적
- [ ] **로그 보관**: 6개월 (압축 저장)
- [ ] **SIEM 연동**: 준비됨

## 🔍 취약점 관리
- [ ] **의존성 스캔**: 일일 npm audit
- [ ] **코드 스캔**: 주간 SonarQube
- [ ] **컨테이너 스캔**: Trivy
- [ ] **시크릿 스캔**: GitHub Secret Scanning
- [ ] **침투 테스트**: 월간 OWASP ZAP

## 🚨 위험 신호 (Red Flags)
⚠️ **즉시 확인 필요한 항목**:
- [ ] 하드코딩된 API 키/토큰
- [ ] 평문 패스워드 저장
- [ ] SQL 쿼리 직접 조합
- [ ] 무제한 API 호출 허용
- [ ] 로그에 민감정보 노출

## 📱 연락처
- **보안 사고**: security@company.com
- **온콜 엔지니어**: +82-10-XXXX-XXXX
- **Slack**: #mcphub-security

## 🔧 빠른 대응 명령어
```bash
# 사용자 차단
curl -X PUT https://mcphub/api/admin/users/{userId}/block

# 모든 세션 종료
redis-cli --scan --pattern "mcphub:session:*" | xargs redis-cli del

# API 키 비활성화
psql -c "UPDATE mcphub_keys SET is_active = false WHERE user_id = 'UUID'"

# 로그 확인
kubectl logs -n mcphub deployment/mcphub --tail=1000 | grep ERROR
```

---
⏰ **최종 업데이트**: 2025-08-21  
📋 **다음 검토일**: 2025-02-20
