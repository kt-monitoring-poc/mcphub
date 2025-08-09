# MCPHub v3.1 소스코드 변경사항 상세 분석

## 📋 개요

MCPHub v3.1에서는 **00시 정각 실행** 환경변수 스케줄러 기능이 추가되었습니다. 이 문서는 모든 변경된 소스코드를 상세히 분석하고 향후 유지보수를 위한 가이드를 제공합니다.

## 🗂️ 변경된 파일 목록

### 🖥️ 백엔드 파일 (6개)

1. **`src/services/envVarScheduler.ts`** - 핵심 스케줄러 로직 (새로운 파일)
2. **`src/routes/index.ts`** - API 엔드포인트 추가
3. **`src/server.ts`** - 서버 시작시 스케줄러 초기화

### 🎨 프론트엔드 파일 (3개)

4. **`frontend/src/pages/admin/EnvVarManagementPage.tsx`** - 관리 UI (새로운 파일)
5. **`frontend/src/layouts/AdminLayout.tsx`** - 관리자 메뉴 추가
6. **`frontend/src/App.tsx`** - 라우팅 추가

### 📚 문서 파일 (4개)

7. **`docs/release-notes/v3.1.0-scheduled-execution.md`** - 릴리즈 노트 (새로운 파일)
8. **`docs/api-reference.md`** - API 문서 업데이트
9. **`docs/mcphub-env-var-system.md`** - 시스템 가이드 업데이트
10. **`README.md`** - 메인 문서 업데이트

---

## 📝 상세 코드 분석

### 1. 핵심 스케줄러 로직 (`src/services/envVarScheduler.ts`)

#### 🎯 주요 클래스: `EnvVarScheduler`

```typescript
export class EnvVarScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private config: SchedulerConfig;
  private isRunning = false;
}
```

**핵심 상태 관리:**
- `intervalId`: setTimeout/setInterval 참조
- `config`: 스케줄러 설정 객체
- `isRunning`: 실행 상태 플래그

#### 🔧 핵심 메서드 분석

##### `start()` - 스케줄러 시작
```typescript
start(): void {
  if (!this.config.enabled || this.isRunning) return;

  if (this.config.scheduledTime) {
    console.log(`매일 ${this.config.scheduledTime}에 실행`);
    this.scheduleAtSpecificTime();  // 🆕 특정 시간 모드
  } else {
    console.log(`${this.config.intervalHours}시간 간격`);
    this.scheduleWithInterval();    // 기존 간격 모드
  }
  
  this.isRunning = true;
}
```

**로직 플로우:**
1. 활성화 및 중복 실행 체크
2. `scheduledTime` 존재 여부로 모드 결정
3. 해당 모드의 스케줄링 메서드 호출
4. 실행 상태 플래그 설정

##### `scheduleAtSpecificTime()` - 🆕 특정 시간 스케줄링
```typescript
private scheduleAtSpecificTime(): void {
  const now = new Date();
  const nextRun = this.getNextScheduledTime();
  const delay = nextRun.getTime() - now.getTime();

  console.log(`다음 실행 예정: ${nextRun.toLocaleString()}`);

  // 첫 번째 실행까지의 지연 시간 설정
  setTimeout(() => {
    this.runScheduledTask();
    
    // 그 이후부터는 24시간마다 실행
    this.intervalId = setInterval(() => {
      this.runScheduledTask();
    }, 24 * 60 * 60 * 1000);
  }, delay);
}
```

**핵심 아이디어:**
1. **첫 실행 계산**: 현재 시간부터 다음 예정 시간까지의 밀리초 계산
2. **setTimeout 사용**: 첫 실행까지 대기
3. **setInterval 연결**: 첫 실행 후 24시간 간격으로 반복

##### `getNextScheduledTime()` - 🆕 시간 계산 로직
```typescript
private getNextScheduledTime(): Date {
  const now = new Date();
  const [hours, minutes] = this.config.scheduledTime!.split(':').map(Number);
  
  const nextRun = new Date();
  nextRun.setHours(hours, minutes, 0, 0);
  
  // 오늘의 예정 시간이 이미 지났다면 내일로 설정
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  
  return nextRun;
}
```

**로직 설명:**
1. **시간 파싱**: "HH:MM" 문자열을 숫자로 변환
2. **오늘 날짜 설정**: 시/분/초/밀리초 설정
3. **날짜 보정**: 시간이 지났으면 다음날로 설정
4. **Date 객체 반환**: 다음 실행 시간

##### `updateConfig()` - 🔄 동적 설정 변경
```typescript
updateConfig(newConfig: Partial<SchedulerConfig>): void {
  const oldConfig = { ...this.config };
  this.config = { ...this.config, ...newConfig };
  
  // 스케줄 관련 설정이 변경되었다면 재시작
  const scheduleChanged = 
    oldConfig.scheduledTime !== this.config.scheduledTime ||
    oldConfig.intervalHours !== this.config.intervalHours ||
    oldConfig.enabled !== this.config.enabled;
  
  if (this.isRunning && scheduleChanged) {
    console.log('📅 스케줄러 설정 변경으로 재시작합니다...');
    this.stop();
    this.start();
  }
}
```

**스마트 재시작 로직:**
1. **설정 백업**: 변경 전 설정 보관
2. **설정 병합**: 새 설정으로 업데이트
3. **변경 감지**: 스케줄 관련 설정 변경 여부 확인
4. **조건부 재시작**: 변경사항이 있고 실행 중이면 재시작

#### 🏗️ 설계 패턴 분석

##### Singleton 패턴
```typescript
export let envVarScheduler: EnvVarScheduler | null = null;

export const initializeScheduler = (config?: Partial<SchedulerConfig>): void => {
  if (envVarScheduler) {
    envVarScheduler.stop();  // 기존 인스턴스 정리
  }
  
  envVarScheduler = new EnvVarScheduler({ ...defaultConfig, ...config });
  envVarScheduler.start();
};
```

**장점:**
- 전역에서 하나의 스케줄러만 존재
- 메모리 누수 방지 (기존 인스턴스 정리)
- 설정 변경시 안전한 재초기화

##### State 패턴
```typescript
// 두 가지 실행 모드
if (this.config.scheduledTime) {
  this.scheduleAtSpecificTime();  // 특정 시간 모드
} else {
  this.scheduleWithInterval();    // 간격 모드
}
```

**확장성:**
- 새로운 스케줄링 모드 추가 용이
- 각 모드별 독립적인 로직 유지
- 설정에 따른 동적 모드 전환

### 2. API 라우팅 확장 (`src/routes/index.ts`)

#### 🛡️ 새로운 엔드포인트 (관리자 전용)

##### 스케줄러 상태 조회
```typescript
router.get('/admin/env-scheduler/status', requireAuth, async (req, res) => {
  try {
    const { getScheduler } = await import('../services/envVarScheduler.js');
    const scheduler = getScheduler();
    
    if (!scheduler) {
      return res.json({ 
        success: true,
        data: {
          isRunning: false, 
          config: null, 
          nextRunTime: null 
        }
      });
    }
    
    res.json({
      success: true,
      data: scheduler.getStatus()
    });
  } catch (error) {
    console.error('스케줄러 상태 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '스케줄러 상태 조회에 실패했습니다.'
    });
  }
});
```

**핵심 설계 원칙:**
1. **Null Safety**: 스케줄러 미초기화 상태 처리
2. **Dynamic Import**: 순환 참조 방지
3. **Error Handling**: 상세한 에러 메시지와 로깅
4. **Consistent Response**: 표준 응답 형식 유지

##### 설정 업데이트
```typescript
router.post('/admin/env-scheduler/config', requireAuth, async (req, res) => {
  try {
    const { getScheduler } = await import('../services/envVarScheduler.js');
    const scheduler = getScheduler();
    
    if (!scheduler) {
      return res.status(404).json({ 
        success: false,
        message: 'Scheduler not initialized' 
      });
    }
    
    const { enabled, intervalHours, autoCleanup, maxOrphanedKeys, scheduledTime } = req.body;
    
    scheduler.updateConfig({
      enabled: enabled !== undefined ? enabled : undefined,
      intervalHours: intervalHours !== undefined ? intervalHours : undefined,
      autoCleanup: autoCleanup !== undefined ? autoCleanup : undefined,
      maxOrphanedKeys: maxOrphanedKeys !== undefined ? maxOrphanedKeys : undefined,
      scheduledTime: scheduledTime !== undefined ? scheduledTime : undefined
    });
    
    const updatedConfig = scheduler.getConfig();
    res.json({ 
      success: true, 
      message: '스케줄러 설정이 업데이트되었습니다.',
      data: updatedConfig
    });
  } catch (error) {
    console.error('스케줄러 설정 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      message: '스케줄러 설정 업데이트에 실패했습니다.'
    });
  }
});
```

**파라미터 처리 패턴:**
- **Undefined 체크**: 각 파라미터별 개별 처리
- **Partial Update**: 제공된 파라미터만 업데이트
- **즉시 반영**: 설정 변경 후 현재 상태 반환

### 3. 서버 초기화 로직 (`src/server.ts`)

#### 🚀 스케줄러 자동 시작

```typescript
// 환경변수 자동 관리 스케줄러 시작
const schedulerConfig = {
  enabled: process.env.NODE_ENV === 'production', // 프로덕션에서만 기본 활성화
  intervalHours: 24, // 24시간마다
  autoCleanup: false, // 기본적으로 자동 정리 비활성화
  maxOrphanedKeys: 10,
  scheduledTime: "00:00" // 🆕 기본값: 매일 00시
};

if (process.env.ENV_SCHEDULER_ENABLED === 'true') {
  schedulerConfig.enabled = true;
}

if (process.env.ENV_AUTO_CLEANUP === 'true') {
  schedulerConfig.autoCleanup = true;
}

initializeScheduler(schedulerConfig);

if (schedulerConfig.enabled) {
  console.log('🕐 환경변수 자동 관리 스케줄러가 활성화되었습니다.');
}
```

**환경변수 우선순위:**
1. `ENV_SCHEDULER_ENABLED=true` → 개발환경에서도 강제 활성화
2. `ENV_AUTO_CLEANUP=true` → 자동 정리 활성화 (위험)
3. `NODE_ENV=production` → 프로덕션에서 기본 활성화

**설계 의도:**
- **안전 우선**: 기본적으로 자동 정리 비활성화
- **환경별 제어**: 개발/프로덕션 환경 구분
- **명시적 활성화**: 개발자가 의도적으로 활성화 필요

### 4. 프론트엔드 관리 UI (`frontend/src/pages/admin/EnvVarManagementPage.tsx`)

#### 🎨 컴포넌트 구조

```typescript
const EnvVarManagementPage: React.FC = () => {
  // 🏪 상태 관리
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 🔧 스케줄러 설정 상태
  const [schedulerConfig, setSchedulerConfig] = useState({
    enabled: false,
    intervalHours: 24,
    autoCleanup: false,
    maxOrphanedKeys: 10,
    scheduledTime: "00:00"  // 🆕
  });
}
```

**상태 관리 패턴:**
- **분리된 상태**: 서버 상태와 UI 상태 분리
- **로딩 상태**: 사용자 피드백을 위한 로딩 표시
- **에러 핸들링**: Toast 컴포넌트로 사용자 알림

#### 🔄 실행 방식 선택 UI

```typescript
<div>
  <label className="block text-sm font-medium mb-1">실행 방식</label>
  <select
    value={schedulerConfig.scheduledTime ? "scheduled" : "interval"}
    onChange={(e) => {
      if (e.target.value === "scheduled") {
        setSchedulerConfig({ ...schedulerConfig, scheduledTime: "00:00" });
      } else {
        setSchedulerConfig({ ...schedulerConfig, scheduledTime: undefined });
      }
    }}
    className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
  >
    <option value="scheduled">특정 시간에 실행</option>
    <option value="interval">주기적 실행</option>
  </select>
  
  {schedulerConfig.scheduledTime ? (
    <div>
      <label className="block text-sm font-medium mb-1">실행 시간</label>
      <input
        type="time"
        value={schedulerConfig.scheduledTime}
        onChange={(e) => setSchedulerConfig({ ...schedulerConfig, scheduledTime: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
      />
      <p className="text-xs text-gray-500 mt-1">매일 지정된 시간에 실행됩니다</p>
    </div>
  ) : (
    <div>
      <label className="block text-sm font-medium mb-1">검증 주기 (시간)</label>
      <input
        type="number"
        min="1"
        max="168"
        value={schedulerConfig.intervalHours}
        onChange={(e) => setSchedulerConfig({ ...schedulerConfig, intervalHours: parseInt(e.target.value) })}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
      />
      <p className="text-xs text-gray-500 mt-1">서버 시작 후 주기적으로 실행됩니다</p>
    </div>
  )}
</div>
```

**UX 설계 원칙:**
1. **조건부 렌더링**: 선택한 모드에 따라 다른 입력 필드 표시
2. **즉시 피드백**: 선택 변경시 상태 즉시 업데이트
3. **도움말 텍스트**: 각 옵션의 동작 방식 명확히 설명
4. **적절한 제약**: time picker, number input으로 유효성 보장

#### 📊 실시간 상태 표시

```typescript
<div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
  <h3 className="font-medium mb-2">현재 상태</h3>
  <p className="text-sm">
    실행 중: <span className={schedulerStatus?.isRunning ? 'text-green-600' : 'text-red-600'}>
      {schedulerStatus?.isRunning ? '예' : '아니오'}
    </span>
  </p>
  {schedulerStatus?.config?.scheduledTime && (
    <p className="text-sm mt-1">
      실행 방식: 매일 {schedulerStatus.config.scheduledTime}
    </p>
  )}
  {schedulerStatus?.nextRunTime && (
    <p className="text-sm mt-1">
      다음 실행: {new Date(schedulerStatus.nextRunTime).toLocaleString()}
    </p>
  )}
</div>
```

**정보 표시 전략:**
- **상태 색상**: 초록/빨강으로 실행 상태 직관적 표시
- **조건부 정보**: 해당하는 정보만 표시 (scheduledTime 존재시만)
- **로컬라이제이션**: 사용자 시간대로 변환하여 표시

---

## 🔍 트러블슈팅 가이드

### 1. 스케줄러가 시작되지 않는 경우

#### 🕵️ 진단 방법
```bash
# 1. 스케줄러 상태 확인
curl http://localhost:3000/api/admin/env-scheduler/status

# 2. 서버 로그 확인
# 다음 메시지가 있는지 확인:
# "🕐 환경변수 자동 관리 스케줄러 시작"
```

#### 🔧 해결 방법
```typescript
// src/server.ts에서 확인할 부분
const schedulerConfig = {
  enabled: process.env.NODE_ENV === 'production',  // ← 이 부분 확인
  // ...
};

// 개발 환경에서 강제 활성화
if (process.env.ENV_SCHEDULER_ENABLED === 'true') {
  schedulerConfig.enabled = true;  // ← 이 설정이 적용되는지 확인
}
```

### 2. 시간 설정이 반영되지 않는 경우

#### 🕵️ 진단 방법
```bash
# API로 직접 설정 시도
curl -X POST http://localhost:3000/api/admin/env-scheduler/config \
  -H "Content-Type: application/json" \
  -d '{"scheduledTime": "02:30"}'

# 응답에서 data.scheduledTime 확인
```

#### 🔧 해결 방법
```typescript
// updateConfig() 메서드에서 확인할 부분
const scheduleChanged = 
  oldConfig.scheduledTime !== this.config.scheduledTime ||  // ← 문자열 비교 정확성
  oldConfig.intervalHours !== this.config.intervalHours ||
  oldConfig.enabled !== this.config.enabled;

if (this.isRunning && scheduleChanged) {
  console.log('📅 스케줄러 설정 변경으로 재시작합니다...');  // ← 이 로그 확인
  this.stop();
  this.start();
}
```

### 3. 다음 실행 시간이 이상한 경우

#### 🕵️ 진단 방법
```typescript
// getNextScheduledTime() 로직 검증
const now = new Date();
const [hours, minutes] = "00:00".split(':').map(Number);

const nextRun = new Date();
nextRun.setHours(hours, minutes, 0, 0);

console.log('현재 시간:', now);
console.log('예정 시간:', nextRun);
console.log('다음날 여부:', nextRun <= now);
```

#### 🔧 해결 방법
```typescript
// 시간대 이슈 해결
private getNextScheduledTime(): Date {
  const now = new Date();
  const [hours, minutes] = this.config.scheduledTime!.split(':').map(Number);
  
  const nextRun = new Date();
  nextRun.setHours(hours, minutes, 0, 0);
  
  // 시간대 보정 (필요시)
  // nextRun.setTimezoneOffset(now.getTimezoneOffset());
  
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  
  return nextRun;
}
```

---

## 🧪 테스트 시나리오

### 1. 기본 동작 테스트

```bash
# 1. 서버 시작 (스케줄러 비활성화 상태)
pnpm start:dev

# 2. 스케줄러 활성화
curl -X POST http://localhost:3000/api/admin/env-scheduler/config \
  -d '{"enabled": true, "scheduledTime": "00:00"}'

# 3. 상태 확인
curl http://localhost:3000/api/admin/env-scheduler/status

# 4. 수동 실행 테스트
curl -X POST http://localhost:3000/api/admin/env-scheduler/run
```

### 2. 시간 변경 테스트

```bash
# 1. 새벽 2시 30분으로 변경
curl -X POST http://localhost:3000/api/admin/env-scheduler/config \
  -d '{"scheduledTime": "02:30"}'

# 2. 다시 00시로 변경
curl -X POST http://localhost:3000/api/admin/env-scheduler/config \
  -d '{"scheduledTime": "00:00"}'

# 3. 간격 모드로 변경
curl -X POST http://localhost:3000/api/admin/env-scheduler/config \
  -d '{"scheduledTime": null, "intervalHours": 6}'
```

### 3. 웹 UI 테스트

1. **http://localhost:5173/admin/env-vars** 접속
2. **실행 방식** 드롭다운 변경
3. **시간 설정** 입력
4. **설정 저장** 버튼 클릭
5. **현재 상태** 섹션에서 변경 확인

---

## 🚀 향후 확장 가이드

### 1. 새로운 스케줄링 모드 추가

```typescript
// SchedulerConfig 인터페이스 확장
export interface SchedulerConfig {
  enabled: boolean;
  intervalHours: number;
  autoCleanup: boolean;
  maxOrphanedKeys: number;
  scheduledTime?: string;
  weeklySchedule?: string[];  // 🆕 주간 스케줄
  cronExpression?: string;    // 🆕 크론 표현식
}

// start() 메서드 확장
start(): void {
  if (!this.config.enabled || this.isRunning) return;

  if (this.config.cronExpression) {
    this.scheduleWithCron();        // 🆕 크론 모드
  } else if (this.config.weeklySchedule) {
    this.scheduleWeekly();          // 🆕 주간 모드
  } else if (this.config.scheduledTime) {
    this.scheduleAtSpecificTime();  // 기존 특정 시간 모드
  } else {
    this.scheduleWithInterval();    // 기존 간격 모드
  }
  
  this.isRunning = true;
}
```

### 2. 알림 시스템 연동

```typescript
// 스케줄러에 알림 기능 추가
private async notifyAdmin(message: string, type: 'info' | 'warning' | 'error') {
  // 이메일 알림
  if (this.config.emailNotifications) {
    await this.sendEmail(message, type);
  }
  
  // 슬랙 알림
  if (this.config.slackWebhook) {
    await this.sendSlackMessage(message, type);
  }
  
  // 시스템 로그
  console.log(`[${type.toUpperCase()}] ${message}`);
}
```

### 3. 실행 히스토리 저장

```typescript
// 새로운 엔티티 추가
@Entity()
export class SchedulerHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  executedAt: Date;

  @Column()
  duration: number; // 실행 시간 (밀리초)

  @Column()
  foundIssues: number;

  @Column()
  cleanedVars: number;

  @Column('text')
  result: string; // JSON 형태의 상세 결과
}
```

---

## 📊 성능 모니터링

### 메모리 사용량 모니터링

```typescript
// 스케줄러에 메모리 모니터링 추가
private logMemoryUsage(): void {
  const usage = process.memoryUsage();
  console.log('메모리 사용량:', {
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`
  });
}

private async runScheduledTask(): Promise<void> {
  const startTime = Date.now();
  this.logMemoryUsage(); // 실행 전 메모리 체크
  
  try {
    // 기존 작업 실행
    await this.executeValidationAndCleanup();
  } finally {
    const duration = Date.now() - startTime;
    console.log(`실행 완료: ${duration}ms`);
    this.logMemoryUsage(); // 실행 후 메모리 체크
  }
}
```

---

## 📋 체크리스트

### 🛠️ 개발자를 위한 체크리스트

- [ ] 새로운 스케줄링 모드 추가시 `start()` 메서드 업데이트
- [ ] 설정 변경시 `updateConfig()`에서 재시작 로직 확인
- [ ] API 엔드포인트 추가시 권한 검증 포함
- [ ] 프론트엔드 UI 변경시 타입 정의 업데이트
- [ ] 에러 처리 및 로깅 포함
- [ ] 문서 업데이트 (API 문서, 릴리즈 노트)

### 🔍 리뷰어를 위한 체크리스트

- [ ] 메모리 누수 가능성 확인 (setTimeout/setInterval 정리)
- [ ] 에러 처리의 적절성
- [ ] API 보안 (관리자 권한 검증)
- [ ] 타입 안전성 (TypeScript)
- [ ] 사용자 경험 (로딩 상태, 에러 메시지)
- [ ] 기존 기능과의 호환성

---

**작성일**: 2025-08-07  
**작성자**: MCPHub 개발팀  
**버전**: v3.1.0  
**다음 리뷰 예정**: v3.2.0 개발 시
