# MCPHub 지라 백로그 작성용 종합 이슈 정리 (2025-08-09)

> **목적**: 개발 과정에서 발생한 주요 이슈들과 해결 방법을 정리하여 지라 백로그 작성에 활용

---

## 🚨 Critical Issues (긴급 해결 필요했던 문제들)

### 1. **Cursor IDE 연결 불가 ("No tools" 문제)**
- **발생일**: 2025-08-08
- **증상**: 
  - Cursor IDE에서 MCPHub 연결 시 도구가 0개로 표시
  - `MCP error -32601: Method not found` 에러 발생
  - `offerings/list` 요청에 대한 응답 없음

- **근본 원인**:
  - MCP SDK에서 `offerings/list`, `capabilities` 메서드 미지원
  - 세션 ID 존재 시 `tools/list` 요청이 직접 처리되지 않음
  - `prompts/list` 미구현으로 인한 UI 블로킹

- **해결 방법**:
  - `src/services/mcpService.ts`: SDK 레벨에서 초기 협상 메서드 직접 처리
  - `src/services/sseService.ts`: 모든 협상 요청을 허브에서 직접 응답
  - `SessionManager` 도입으로 업스트림 연결 안정화
  - `prompts/list` 빈 배열 응답 추가

- **지라 우선순위**: Critical
- **Story Points**: 8
- **관련 문서**: `docs/troubleshooting/cursor-deadlock-fix-2025-08-09.md`

### 2. **MCPHub 서버 데드락 문제**
- **발생일**: 2025-08-09
- **증상**:
  - 서버가 포트 3000을 리스닝하지만 요청에 응답 안함
  - cURL 요청 시 연결은 되지만 타임아웃 발생
  - Cursor IDE에서 `ConnectError: [aborted] Error` 발생

- **근본 원인**:
  - 장시간 실행 중 메모리 누수 또는 데드락 상태
  - 동시성 테스트 후 서버 상태 불안정
  - 업스트림 MCP 서버 연결에서 무한 대기

- **해결 방법**:
  - `kill -9 [PID]`로 강제 종료 후 재시작
  - 모니터링 스크립트 도입 계획
  - 헬스체크 API 추가 필요

- **지라 우선순위**: High
- **Story Points**: 5
- **관련 문서**: `docs/troubleshooting/cursor-deadlock-fix-2025-08-09.md`

---

## ⚡ Performance Issues (성능 최적화)

### 3. **세션 타임아웃 설정 부적절**
- **발생일**: 2025-08-09
- **증상**:
  - 개발 작업 중 세션이 자주 끊어짐 (2분 후)
  - 하트비트가 너무 빈번함 (30초마다)
  - 네트워크 불안정 시 연결 실패

- **근본 원인**:
  - 보수적인 타임아웃 설정 (개발 도구 특성 미고려)
  - 업계 표준보다 짧은 세션 유지 시간
  - 업스트림 서버 연결 타임아웃 부족

- **해결 방법**:
  - 세션 비활성 타임아웃: 2분 → 15분
  - 하트비트 주기: 30초 → 1분
  - 업스트림 연결 타임아웃: 30초 → 1분
  - 도구 호출 타임아웃: 1분 → 2분
  - HTTP Keep-Alive: 65초 → 3분

- **지라 우선순위**: Medium
- **Story Points**: 3
- **관련 문서**: `docs/operations/timeout-optimization-2025-08-09.md`

### 4. **업스트림 MCP 서버 세션 관리 비효율**
- **발생일**: 2025-08-08
- **증상**:
  - 매 요청마다 새로운 세션 생성
  - MCP 서버 메모리 부하 증가
  - 연결 지연 시간 증가

- **근본 원인**:
  - `Mcp-Session-Id` 재사용 로직 부재
  - 세션 저장소 없음
  - 다중 클라이언트 요청 시 세션 중복 생성

- **해결 방법**:
  - Redis 기반 세션 저장소 구축
  - `StreamableHTTPClientTransport`에서 세션 ID 추출 및 저장
  - 404/400 에러 시 세션 무효화 후 재시도 로직
  - 관리자용 세션 관리 API 추가

- **지라 우선순위**: Medium
- **Story Points**: 5
- **관련 문서**: `docs/guides/upstream-session-store.md`

---

## 🗂️ Documentation Issues (문서화 문제)

### 5. **문서 구조 혼재 및 중복**
- **발생일**: 2025-08-09
- **증상**:
  - docs 폴더에 95개 문서 산재
  - 동일 주제의 중복 문서 다수 (디버그 로깅 5개, 세션 관리 6개)
  - 신규 개발자 온보딩 어려움

- **근본 원인**:
  - 체계적인 문서 분류 체계 부재
  - 개발 과정에서 임시 문서들 누적
  - 문서 네이밍 규칙 부재

- **해결 방법**:
  - 6개 카테고리로 체계적 분류 (guides, tutorials, references, operations, development, troubleshooting)
  - 중복 문서 16개를 archive 폴더로 이동
  - 역할별 읽기 가이드 및 우선순위 표시
  - 통합된 README.md 네비게이션

- **지라 우선순위**: Low
- **Story Points**: 3
- **관련 문서**: `docs/README.md`

### 6. **브랜치 관리 혼재**
- **발생일**: 2025-08-09
- **증상**:
  - 27개 브랜치 존재로 관리 복잡
  - 어떤 브랜치가 최신인지 불분명
  - 작업 완료된 브랜치들 정리 안됨

- **근본 원인**:
  - 브랜치 수명 주기 관리 부재
  - 브랜치별 목적과 상태 추적 어려움
  - 정리 기준 및 절차 없음

- **해결 방법**:
  - `BRANCH_HISTORY.md` 작성으로 전체 히스토리 정리
  - 브랜치별 발전 과정 및 주요 성과 문서화
  - 정리 대상 브랜치 10+개 식별
  - 향후 브랜치 네이밍 규칙 및 전략 수립

- **지라 우선순위**: Low
- **Story Points**: 2
- **관련 문서**: `BRANCH_HISTORY.md`

---

## 🔧 Technical Debt (기술 부채)

### 7. **환경변수 템플릿 변경에 따른 호환성 문제**
- **발생일**: 2025-08-08
- **증상**:
  - `${USER_GITHUB_TOKEN}` → `${GITHUB_TOKEN}` 변경으로 인한 혼선
  - 기존 설정과 새 설정 간 호환성 문제
  - Cursor IDE 설정 불일치

- **근본 원인**:
  - 환경변수 네이밍 표준 변경
  - 하위 호환성 고려 부족
  - 마이그레이션 가이드 부재

- **해결 방법**:
  - `src/services/mcpService.ts`에서 양방향 호환성 지원
  - `applyUserApiKeysToConfig`에서 `USER_*` 및 일반 패턴 모두 지원
  - 문서에 마이그레이션 가이드 추가

- **지라 우선순위**: Medium
- **Story Points**: 3

### 8. **디버그 로깅 시스템 중복 구현**
- **발생일**: 2025-08-08
- **증상**:
  - 5개의 서로 다른 디버그 로깅 구현
  - 로그 형식 불일치
  - 성능 오버헤드 우려

- **근본 원인**:
  - 점진적 개발 과정에서 여러 버전 생성
  - 최종 버전 선택 및 통합 지연
  - 레거시 코드 정리 부족

- **해결 방법**:
  - `debug-logging-system-final.md`를 기준으로 통합
  - 기존 4개 버전을 archive로 이동
  - 통합된 로깅 시스템 문서화

- **지라 우선순위**: Low
- **Story Points**: 2

---

## 🧪 Testing Issues (테스트 관련)

### 9. **동시성 테스트 도구 부재**
- **발생일**: 2025-08-08
- **증상**:
  - 70명 동시 접속 시뮬레이션 어려움
  - 세션 재사용 검증 방법 부족
  - 부하 테스트 결과 추적 어려움

- **근본 원인**:
  - 체계적인 부하 테스트 도구 부재
  - 동시성 시나리오 테스트 자동화 부족
  - 성능 메트릭 수집 체계 부재

- **해결 방법**:
  - `scripts/concurrency-call-tool.ts` 개발
  - Shell 스크립트 → TypeScript 전환으로 안정성 향상
  - Jira `get_agile_boards`, GitHub `get_pull_requests` 테스트 수행
  - 테스트 결과 문서화 체계 구축

- **지라 우선순위**: Medium
- **Story Points**: 5
- **관련 문서**: `docs/tutorials/concurrency-test.md`

### 10. **MCP 서버별 세션 ID 노출 여부 불분명**
- **발생일**: 2025-08-08
- **증상**:
  - 어떤 MCP 서버가 `Mcp-Session-Id`를 제공하는지 불분명
  - 세션 재사용 로직 테스트 어려움
  - 서버별 동작 차이 검증 불가

- **근본 원인**:
  - MCP 서버 구현체별 차이
  - 세션 관리 표준 부재
  - 테스트용 MCP 서버 부족

- **해결 방법**:
  - `servers/fastmcp-session-test/server.js` 개발
  - 명시적으로 `Mcp-Session-Id` 노출하는 테스트 서버
  - `get_session_id` 도구로 세션 추적 가능
  - 서버별 세션 지원 여부 문서화

- **지라 우선순위**: Low
- **Story Points**: 3

---

## 📊 Analytics & Monitoring (모니터링 필요)

### 11. **서버 헬스체크 시스템 부재**
- **현재 상태**: 미구현
- **필요성**: 서버 데드락 문제 조기 발견
- **제안 해결책**:
  - `/api/health` 엔드포인트 추가
  - 1분마다 상태 점검 스크립트
  - 자동 재시작 로직

- **지라 우선순위**: High
- **Story Points**: 3

### 12. **메모리 및 성능 모니터링 부재**
- **현재 상태**: 기본 로깅만 존재
- **필요성**: 세션 증가에 따른 리소스 사용량 추적
- **제안 해결책**:
  - PM2 기반 리소스 모니터링
  - 세션 수명 추적
  - 메모리 사용량 알림

- **지라 우선순위**: Medium
- **Story Points**: 5

---

## 🔮 Future Enhancements (향후 개선 사항)

### 13. **다중 인스턴스 운영 지원**
- **현재 제약**: 단일 인스턴스만 지원
- **필요성**: 고가용성 및 로드 분산
- **제안 해결책**:
  - Redis 기반 세션 공유
  - 로드 밸런서 지원
  - 무중단 배포 지원

- **지라 우선순위**: Low
- **Story Points**: 8

### 14. **캐싱 전략 도입**
- **현재 제약**: 모든 요청이 업스트림으로 전달
- **필요성**: 응답 속도 향상 및 업스트림 부하 감소
- **제안 해결책**:
  - Redis 기반 응답 캐싱
  - TTL 기반 캐시 무효화
  - 캐시 히트율 모니터링

- **지라 우선순위**: Low
- **Story Points**: 5

---

## 📋 지라 백로그 작성 가이드

### Epic 구성 제안:

#### Epic 1: Critical Issues Resolution
- **Story 1**: Cursor IDE 호환성 완성 (Story Points: 8)
- **Story 2**: 서버 안정성 강화 (Story Points: 5)
- **Story 3**: 헬스체크 시스템 구축 (Story Points: 3)

#### Epic 2: Performance Optimization  
- **Story 4**: 타임아웃 설정 최적화 (Story Points: 3)
- **Story 5**: 업스트림 세션 관리 (Story Points: 5)
- **Story 6**: 메모리 모니터링 (Story Points: 5)

#### Epic 3: Documentation & Maintenance
- **Story 7**: 문서 구조 개선 (Story Points: 3)
- **Story 8**: 브랜치 관리 정리 (Story Points: 2)
- **Story 9**: 기술 부채 해결 (Story Points: 5)

#### Epic 4: Testing & Quality Assurance
- **Story 10**: 동시성 테스트 프레임워크 (Story Points: 5)
- **Story 11**: MCP 서버 호환성 테스트 (Story Points: 3)

#### Epic 5: Future Enhancements
- **Story 12**: 다중 인스턴스 지원 (Story Points: 8)
- **Story 13**: 캐싱 시스템 (Story Points: 5)

### 우선순위 매트릭스:

| 우선순위 | Epic | 비즈니스 가치 | 기술적 복잡도 |
|----------|------|---------------|---------------|
| **P0** | Critical Issues | High | Medium |
| **P1** | Performance Optimization | High | Low |
| **P2** | Documentation & Maintenance | Medium | Low |
| **P3** | Testing & QA | Medium | Medium |
| **P4** | Future Enhancements | Low | High |

---

**작성일**: 2025-08-09  
**작성자**: jungchihoon  
**총 Story Points**: 67점  
**예상 Sprint**: 4-5개 Sprint (2주 Sprint 기준)
