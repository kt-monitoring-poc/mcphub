/**
 * 환경변수 기반 로깅 시스템
 * 프로덕션 환경에서는 디버그 로그가 자동으로 비활성화됩니다.
 */

const isDevelopment = import.meta.env.DEV;
const isDebugEnabled = import.meta.env.VITE_DEBUG_LOGS === 'true' || isDevelopment;

export const logger = {
    /**
     * 개발 전용 디버그 로그 (프로덕션에서 비활성화)
     */
    debug: (...args: any[]) => {
        if (isDebugEnabled) {
            console.log('[DEBUG]', ...args);
        }
    },

    /**
     * 정보성 로그 (항상 활성화)
     */
    info: (...args: any[]) => {
        console.log('[INFO]', ...args);
    },

    /**
     * 경고 로그 (항상 활성화)
     */
    warn: (...args: any[]) => {
        console.warn('[WARN]', ...args);
    },

    /**
     * 에러 로그 (항상 활성화)
     */
    error: (...args: any[]) => {
        console.error('[ERROR]', ...args);
    },

    /**
     * 보안상 민감한 정보를 마스킹하여 로그
     */
    secureInfo: (message: string, data?: any) => {
        if (isDebugEnabled) {
            // 개발 환경에서는 전체 정보 표시
            console.log('[SECURE]', message, data);
        } else {
            // 프로덕션에서는 마스킹된 정보만 표시
            console.log('[SECURE]', message, '***');
        }
    }
};

export default logger; 