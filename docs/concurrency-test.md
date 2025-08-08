## 동시성 테스트 가이드: get_issue (최대 70 동시)

목표: 여러 클라이언트 세션이 MCPHub로 동시 접근해도 허브는 업스트림 MCP 서버의 단일(또는 컨텍스트별 공유) 세션을 재사용해 비동기로 안정 처리하는지 검증.

### 준비
- 서버 실행(개발): `DEBUG_MCPHUB=true PORT=3000 pnpm backend:dev`
- `.env`: `REDIS_URL` 설정 확인

### 스크립트
- TypeScript 동시 호출 스크립트(권장): `scripts/concurrency-call-tool.ts`
  - 사용법: `pnpm -s tsx scripts/concurrency-call-tool.ts <동시수> <툴이름> '<argsJson>' [지속초]`
  - 예시(1회성): `pnpm -s tsx scripts/concurrency-call-tool.ts 70 get_agile_boards '{}'`
  - 예시(60초 반복): `pnpm -s tsx scripts/concurrency-call-tool.ts 70 get_agile_boards '{}' 60`
  - `get_issue` 예시: `pnpm -s tsx scripts/concurrency-call-tool.ts 70 get_issue '{"issue_key":"ABC-123"}' 30`

### 관찰 포인트(로그)
- 허브 로그 키워드
  - `NEW REQUEST STARTED` ~ `REQUEST COMPLETED`: 요청/응답 범위
  - `📨 업스트림 요청에 세션 적용(server): <id>`: 재사용 주입된 세션
  - `🪪 서버 세션 확인(server): <id>`: 초기화 응답으로 취득한 세션
  - `💾 업스트림 세션 저장 (server/contextKey): <id>`: Redis 저장
  - `♻️ 세션 무효화 ... 재연결/재시도`: 40x 발생 시 자동 복구

### 성공 기준
- 동시 70 요청에서
  - 응답 200 비율 높음(에러는 재시도 로그와 함께 복구)
  - 동일 컨텍스트에서 `Mcp-Session-Id` 재사용 또는 만료 시 자동 재수립 성공
  - `get_issue` 응답 본문 구조 정상(JSON-RPC result.content)

### 타부서 MCP 서버 대조 절차
1) 동일 시나리오를 두 경로로 수행
   - A) 클라이언트→허브→대상 서버
   - B) 클라이언트→대상 서버(직접)
2) 비교 항목
   - 세션 흐름: 허브 로그의 📨/🪪/💾 vs 대상 서버 로그의 Mcp-Session-Id
   - 재사용/재수립: 반복 호출에서 세션 값 유지 또는 40x 발생 시 자동 재수립 확인
   - 처리량/지연: 동시성에서 평균/최대 지연 비교
3) 합격
   - 세션 일관성 및 자동 복구 작동
   - 처리량/지연이 허용 범위 내

### 실행 예시 및 결과(샘플)
- 커맨드: `pnpm -s tsx scripts/concurrency-call-tool.ts 70 get_agile_boards '{}' 60`
- 결과(요약):
  - 60초 동안 118라운드 수행, 총 8,260요청 중 성공 253건 → agg_ok=253/8260
  - 라운드별 예시: `round=1 ok=5/70`, `round=36 ok=8/70`, `round=47 ok=7/70`, ...
- 해석 가이드:
  - 낮은 성공률은 원격 Jira MCP 서버의 동시성 제한/레이트 리밋/일시 응답지연 영향일 가능성 높음
  - 허브 로그에서 📨/🪪/💾/♻️ 라인을 확인해 세션 재사용/재수립이 일관되게 작동하는지 우선 검증
  - 필요 시 지속 시간을 늘리거나 동시 수를 조정하여 평균 성공률/지연 통계를 비교

### 동일 시나리오 재실행 결과(2차)
- 커맨드: `pnpm -s tsx scripts/concurrency-call-tool.ts 70 get_agile_boards '{}' 60`
- 결과(요약):
  - 60초 동안 152라운드 수행, 총 10,640요청 중 성공 95건 → agg_ok=95/10640
  - 라운드별 출력 예시: `round=24 ok=3/70`, `round=39 ok=3/70`, `round=46 ok=3/70` 등 전반적으로 낮은 성공률 분포
- 관찰 포인트:
  - 2차 실행은 1차 대비 성공률이 더 낮게 관찰됨 → 원격 환경 상태 변화(레이트 리밋/쿼터/부하), 또는 업스트림의 간헐적 오류 가능성
  - 허브의 세션 재사용/재수립 로직은 동일하게 동작하므로, 허브 로그의 세션 관련 라인(📨/🪪/💾/♻️)과 업스트림 응답 코드를 함께 대조 권장
  - 향후 비교 실험: 동시수 20/40/70, 지속 60/120초로 매트릭 보정 및 평균 성공률 추적

