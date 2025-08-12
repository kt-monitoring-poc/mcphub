/**
 * 환경변수 자동 관리 스케줄러
 * 
 * 주기적으로 환경변수 상태를 검증하고 정리하는 백그라운드 서비스
 */

import { loadSettings } from '../config/index.js';
import { cleanupObsoleteEnvVars, getCurrentEnvVars } from '../utils/envVarCleanup.js';
import { validateEnvVarMapping } from '../utils/envVarValidation.js';

export interface SchedulerConfig {
    enabled: boolean;
    intervalHours: number;
    autoCleanup: boolean;
    maxOrphanedKeys: number;
    scheduledTime?: string; // "HH:MM" 형식, 예: "00:00"
}

export class EnvVarScheduler {
    private intervalId: NodeJS.Timeout | null = null;
    private config: SchedulerConfig;
    private isRunning = false;

    constructor(config: SchedulerConfig = {
        enabled: true,
        intervalHours: 24, // 24시간마다
        autoCleanup: false, // 기본적으로 자동 정리 비활성화 (안전)
        maxOrphanedKeys: 10, // 10개 이상 고아 키가 있으면 알림
        scheduledTime: "00:00" // 매일 00시 00분에 실행
    }) {
        this.config = config;
    }

    /**
 * 스케줄러 시작
 */
    start(): void {
        if (!this.config.enabled || this.isRunning) {
            return;
        }

        if (this.config.scheduledTime) {
            console.log(`🕐 환경변수 자동 관리 스케줄러 시작 (매일 ${this.config.scheduledTime}에 실행)`);
            this.scheduleAtSpecificTime();
        } else {
            console.log(`🕐 환경변수 자동 관리 스케줄러 시작 (${this.config.intervalHours}시간 간격)`);
            this.scheduleWithInterval();
        }

        this.isRunning = true;
    }

    /**
     * 특정 시간에 실행되도록 스케줄링
     */
    private scheduleAtSpecificTime(): void {
        const now = new Date();
        const nextRun = this.getNextScheduledTime();
        const delay = nextRun.getTime() - now.getTime();

        console.log(`📅 다음 실행 예정: ${nextRun.toLocaleString()}`);

        // 첫 번째 실행까지의 지연 시간 설정
        setTimeout(() => {
            this.runScheduledTask();

            // 그 이후부터는 24시간마다 실행
            this.intervalId = setInterval(() => {
                this.runScheduledTask();
            }, 24 * 60 * 60 * 1000);
        }, delay);
    }

    /**
     * 일정한 간격으로 실행되도록 스케줄링
     */
    private scheduleWithInterval(): void {
        // 즉시 한 번 실행
        this.runScheduledTask();

        // 주기적 실행 설정
        const intervalMs = this.config.intervalHours * 60 * 60 * 1000;
        this.intervalId = setInterval(() => {
            this.runScheduledTask();
        }, intervalMs);
    }

    /**
     * 다음 예정된 실행 시간 계산
     */
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

    /**
     * 스케줄러 중지
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('🛑 환경변수 자동 관리 스케줄러 중지');
    }

    /**
 * 설정 업데이트
 */
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

    /**
     * 현재 설정 조회
     */
    getConfig(): SchedulerConfig {
        return { ...this.config };
    }

    /**
     * 스케줄된 작업 실행
     */
    private async runScheduledTask(): Promise<void> {
        try {
            console.log('🔍 환경변수 자동 검증 시작...');

            // 1. 환경변수 매핑 검증
            const validationResult = await validateEnvVarMapping();

            const errorCount = validationResult.issues.filter(i => i.severity === 'ERROR').length;
            const warningCount = validationResult.issues.filter(i => i.severity === 'WARNING').length;
            const orphanedCount = validationResult.summary.orphanedKeys.length;

            console.log(`📊 검증 결과: 오류 ${errorCount}개, 경고 ${warningCount}개, 고아 키 ${orphanedCount}개`);

            // 2. 알림 조건 확인
            if (errorCount > 0) {
                console.warn(`🚨 환경변수 매핑에 ${errorCount}개의 오류가 있습니다!`);
            }

            if (orphanedCount >= this.config.maxOrphanedKeys) {
                console.warn(`⚠️  ${orphanedCount}개의 사용되지 않는 환경변수가 있습니다!`);
            }

            // 3. 자동 정리 (활성화된 경우에만)
            if (this.config.autoCleanup && orphanedCount > 0) {
                console.log('🧹 자동 정리 시작...');

                const settings = loadSettings();
                const currentEnvVars = getCurrentEnvVars(settings);

                const cleanupResult = await cleanupObsoleteEnvVars(currentEnvVars, false);

                if (cleanupResult.success) {
                    console.log(`✅ 자동 정리 완료: ${cleanupResult.affectedUsers}명의 사용자에서 ${cleanupResult.removedVars.length}개 키 제거`);
                } else {
                    console.error(`❌ 자동 정리 실패: ${cleanupResult.message}`);
                }
            }

            console.log('✅ 환경변수 자동 검증 완료');

        } catch (error) {
            console.error('❌ 환경변수 자동 검증 중 오류:', error);
        }
    }

    /**
     * 수동으로 즉시 실행
     */
    async runManually(): Promise<void> {
        console.log('🔧 환경변수 검증 수동 실행...');
        await this.runScheduledTask();
    }

    /**
 * 스케줄러 상태 조회
 */
    getStatus() {
        let nextRunTime: string | null = null;

        if (this.isRunning) {
            if (this.config.scheduledTime) {
                nextRunTime = this.getNextScheduledTime().toISOString();
            } else {
                nextRunTime = new Date(Date.now() + this.config.intervalHours * 60 * 60 * 1000).toISOString();
            }
        }

        return {
            isRunning: this.isRunning,
            config: this.config,
            nextRunTime
        };
    }
}

// 전역 스케줄러 인스턴스
export let envVarScheduler: EnvVarScheduler | null = null;

/**
 * 스케줄러 초기화
 */
export const initializeScheduler = (config?: Partial<SchedulerConfig>): void => {
    if (envVarScheduler) {
        envVarScheduler.stop();
    }

    const defaultConfig: SchedulerConfig = {
        enabled: true,
        intervalHours: 24,
        autoCleanup: false,
        maxOrphanedKeys: 10,
        scheduledTime: "00:00" // 매일 00시 정각에 실행
    };

    envVarScheduler = new EnvVarScheduler({ ...defaultConfig, ...config });
    envVarScheduler.start();
};

/**
 * 스케줄러 가져오기
 */
export const getScheduler = (): EnvVarScheduler | null => {
    return envVarScheduler;
};