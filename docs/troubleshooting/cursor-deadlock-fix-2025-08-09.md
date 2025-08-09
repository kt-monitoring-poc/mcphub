# MCPHub 서버 데드락 문제 해결 리포트 (2025-08-09)

## 📋 이슈 요약
- **발생일시**: 2025-08-09 03:26 KST
- **증상**: Cursor IDE 연결 불가, MCPHub 서버 무응답
- **영향도**: CRITICAL - 모든 사용자의 Cursor IDE 연결 차단
- **해결시간**: 약 10분

## 🔍 문제 상세

### 사용자 보고 증상
1. **Cursor IDE 측 에러**:
   ```
   ConnectError: [aborted] Error
   ERROR_USER_ABORTED_REQUEST
   ```

2. **서버 연결 테스트 결과**:
   ```bash
   $ curl -v -m 10 http://127.0.0.1:3000/
   * Connected to 127.0.0.1 (127.0.0.1) port 3000
   > GET / HTTP/1.1
   * Operation timed out after 10006 milliseconds with 0 bytes received
   curl: (28) Operation timed out
   ```

3. **포트 상태**:
   ```bash
   $ lsof -nP -iTCP:3000 -sTCP:LISTEN
   node 91448 jungchihoon 40u IPv6 TCP *:3000 (LISTEN)
   ```

### 분석 결과
- **포트는 리스닝 중**: 프로세스 91448이 3000 포트 점유
- **연결은 성공**: TCP 핸드셰이크 완료
- **응답 없음**: 요청 처리 무한 대기 또는 데드락 상태

## 🛠️ 해결 과정

### 1단계: 프로세스 강제 종료
```bash
# 일반 종료 시도 (실패)
kill 91448

# 강제 종료 (성공)
kill -9 91448

# 종료 확인
lsof -nP -iTCP:3000 -sTCP:LISTEN
# (결과: 빈 출력 - 포트 해제됨)
```

### 2단계: 서버 재시작
```bash
pnpm dev
```

### 3단계: 연결 테스트
```bash
# offerings/list 테스트
curl -sS -X POST http://127.0.0.1:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer mcphub_e9a...' \
  -d '{"jsonrpc":"2.0","id":1,"method":"offerings/list","params":{}}'

# 결과: 정상 응답
{"jsonrpc":"2.0","result":{"offerings":{"tools":true,"prompts":true,"resources":false,"logging":false}},"id":1}
```

### 4단계: 도구 목록 확인
```bash
curl -sS -X POST http://127.0.0.1:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer mcphub_e9a...' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | jq '.result.tools | length'

# 결과: 54개 도구 정상 로드
```

## ✅ 해결 확인

### Cursor IDE 연결 테스트
- **설정**: `~/.cursor/mcp.json`
  ```json
  {
    "mcp-hub": {
      "type": "streamable-http",
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer mcphub_e9a2d03d95400afe74274c07122169fca44e79395818a78fb18b2afbfa69ae82"
      }
    }
  }
  ```

- **결과**: 
  - ✅ Cursor IDE 정상 연결
  - ✅ 54개 도구 목록 표시
  - ✅ MCP 프로토콜 협상 성공
  - ✅ 세션 생성 및 유지 정상

### 서버 로그 분석
```
[0] Session created: 66b7d88c-c020-4263-aa72-0fd111180902
[0] ✅ MCPHub Key 인증 성공: jungchihoon - MCPHub Key
[0] 📤 tools/list 직접 응답 전송
[0] ✅ [req_1754709999879_3zcu4qzoi] REQUEST COMPLETED
```

## 🔍 근본 원인 분석

### 가능한 원인들
1. **메모리 누수**: 장시간 실행 중 메모리 부족으로 응답 불가
2. **비동기 처리 데드락**: Promise 체인에서 무한 대기 상태
3. **외부 MCP 서버 연결 블로킹**: 업스트림 서버 응답 대기 중 전체 서버 멈춤
4. **Redis 연결 문제**: 세션 저장소 연결 이슈로 요청 처리 블로킹

### 예상 시나리오
- 이전 concurrency 테스트 (70명 동시 접속) 이후 서버 상태 불안정
- 업스트림 MCP 서버들과의 연결에서 타임아웃 미처리
- Redis 세션 저장 중 I/O 블로킹

## 📋 예방 조치

### 1. 모니터링 강화
```bash
# 서버 상태 주기적 점검
curl -m 5 -sS http://127.0.0.1:3000/health || echo "Server not responding"
```

### 2. 자동 복구 스크립트
```bash
#!/bin/bash
# check-mcphub-health.sh
if ! curl -m 5 -sS http://127.0.0.1:3000/mcp > /dev/null 2>&1; then
    echo "MCPHub not responding, restarting..."
    pkill -f "pnpm dev"
    sleep 2
    pnpm dev &
fi
```

### 3. 코드 개선 계획
- [ ] 업스트림 MCP 서버 연결에 타임아웃 설정 강화
- [ ] Redis 연결 에러 핸들링 개선
- [ ] 헬스체크 엔드포인트 추가 (`/health`)
- [ ] 메모리 사용량 모니터링 로그 추가

## 📊 영향도 평가

### 서비스 영향
- **사용자**: 모든 Cursor IDE 사용자
- **기능**: MCP 도구 접근 완전 차단
- **지속시간**: 약 10분
- **데이터 손실**: 없음

### 비즈니스 영향
- **개발 생산성**: 일시적 중단
- **고객 만족도**: 단기적 영향
- **서비스 신뢰성**: 중요한 안정성 이슈

## 🎯 후속 조치

### 단기 (1주일 내)
1. **헬스체크 API 구현**: `/api/health` 엔드포인트 추가
2. **자동 모니터링**: 1분마다 서버 상태 점검 스크립트 배포
3. **타임아웃 설정**: 모든 외부 연결에 5초 타임아웃 적용

### 중기 (1개월 내)
1. **서킷 브레이커 패턴**: 업스트림 서버 연결 안정성 강화
2. **메모리 모니터링**: PM2 또는 Docker 환경에서 리소스 모니터링
3. **그레이스풀 셧다운**: 서버 종료 시 진행 중인 요청 완료 대기

### 장기 (3개월 내)
1. **로드 밸런싱**: 다중 인스턴스 운영으로 단일 장애점 제거
2. **캐싱 전략**: Redis 기반 응답 캐싱으로 업스트림 의존성 최소화
3. **알림 시스템**: 서버 다운타임 자동 알림 구축

## 📝 지라 백로그 항목

### Epic: MCPHub 안정성 강화
- **Priority**: Critical
- **Story Points**: 13

### User Stories:
1. **[MCPHUB-XXX] 헬스체크 API 구현**
   - As a DevOps engineer, I want a health check endpoint to monitor MCPHub status
   - Acceptance Criteria: `/api/health` returns 200 with service status
   - Story Points: 3

2. **[MCPHUB-XXX] 업스트림 연결 타임아웃 강화**
   - As a user, I want the system to remain responsive even when upstream servers are slow
   - Acceptance Criteria: All external calls timeout after 5 seconds
   - Story Points: 5

3. **[MCPHUB-XXX] 자동 복구 모니터링 시스템**
   - As an administrator, I want automatic detection and restart of failed services
   - Acceptance Criteria: Monitor script restarts MCPHub on failure
   - Story Points: 5

## 🔗 관련 문서
- [Cursor IDE 통합 가이드](../cursor-ide-integration.md)
- [업스트림 세션 저장소 가이드](../upstream-session-store.md)
- [MCPHub 프로젝트 상태](../mcphub-project-status.md)

---
**작성자**: AI Assistant  
**검토자**: jungchihoon  
**작성일**: 2025-08-09  
**버전**: 1.0
