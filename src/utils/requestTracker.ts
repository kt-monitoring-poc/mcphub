/**
 * 사용자별 요청 추적 및 격리 시스템
 * 
 * 다중 사용자 환경에서 요청의 혼재를 방지하고
 * 각 요청을 고유하게 식별하여 올바른 응답 매칭을 보장합니다.
 */


/**
 * 진행 중인 요청 정보
 */
interface PendingRequest {
    requestId: string;
    sessionId: string;
    userId?: string;
    method: string;
    timestamp: number;
    userServiceTokens?: Record<string, string>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout?: NodeJS.Timeout;
}

/**
 * 사용자별 요청 통계
 */
interface UserRequestStats {
    userId: string;
    totalRequests: number;
    pendingRequests: number;
    lastRequestTime: number;
    averageResponseTime: number;
}

/**
 * 요청 추적 및 격리 관리 클래스
 */
export class RequestTracker {
    private pendingRequests: Map<string, PendingRequest> = new Map();
    private userStats: Map<string, UserRequestStats> = new Map();
    private requestTimeout: number = 30000; // 30초 타임아웃

    /**
     * 고유한 요청 ID 생성
     * 
     * @param sessionId 세션 ID
     * @param method 요청 메서드
     * @param userId 사용자 ID (선택적)
     * @returns 고유 요청 ID
     */
    generateRequestId(sessionId: string, method: string, userId?: string): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const userPrefix = userId ? `${userId.substring(0, 8)}-` : '';
        return `${userPrefix}${sessionId.substring(0, 8)}-${method}-${timestamp}-${random}`;
    }

    /**
     * 사용자별 세션 ID 생성
     * 
     * @param mcpHubSessionId MCPHub 세션 ID
     * @param userId 사용자 ID
     * @returns 사용자별 세션 ID
     */
    generateUserSessionId(mcpHubSessionId: string, userId: string): string {
        return `${userId}-${mcpHubSessionId.substring(0, 8)}`;
    }

    /**
     * 요청 등록 및 추적 시작
     * 
     * @param sessionId 세션 ID
     * @param method 요청 메서드
     * @param userId 사용자 ID
     * @param userServiceTokens 사용자 서비스 토큰
     * @returns Promise와 요청 ID
     */
    trackRequest(
        sessionId: string,
        method: string,
        userId?: string,
        userServiceTokens?: Record<string, string>
    ): { requestId: string; promise: Promise<any> } {
        const requestId = this.generateRequestId(sessionId, method, userId);
        const timestamp = Date.now();

        return {
            requestId,
            promise: new Promise((resolve, reject) => {
                // 타임아웃 설정
                const timeout = setTimeout(() => {
                    this.removeRequest(requestId);
                    reject(new Error(`Request timeout: ${requestId}`));
                }, this.requestTimeout);

                // 요청 정보 저장
                const pendingRequest: PendingRequest = {
                    requestId,
                    sessionId,
                    userId,
                    method,
                    timestamp,
                    userServiceTokens,
                    resolve,
                    reject,
                    timeout
                };

                this.pendingRequests.set(requestId, pendingRequest);

                // 사용자 통계 업데이트
                if (userId) {
                    this.updateUserStats(userId, 'request');
                }

                console.log(`📋 요청 추적 시작: ${requestId} (사용자: ${userId || 'unknown'}, 메서드: ${method})`);
            })
        };
    }

    /**
     * 요청 완료 처리
     * 
     * @param requestId 요청 ID
     * @param result 응답 결과
     */
    completeRequest(requestId: string, result: any): void {
        const request = this.pendingRequests.get(requestId);
        if (!request) {
            console.warn(`⚠️ 알 수 없는 요청 ID: ${requestId}`);
            return;
        }

        // 타임아웃 정리
        if (request.timeout) {
            clearTimeout(request.timeout);
        }

        // 응답 시간 계산
        const responseTime = Date.now() - request.timestamp;

        // 사용자 통계 업데이트
        if (request.userId) {
            this.updateUserStats(request.userId, 'response', responseTime);
        }

        // 요청 완료
        request.resolve(result);
        this.pendingRequests.delete(requestId);

        console.log(`✅ 요청 완료: ${requestId} (응답시간: ${responseTime}ms)`);
    }

    /**
     * 요청 실패 처리
     * 
     * @param requestId 요청 ID
     * @param error 에러 정보
     */
    failRequest(requestId: string, error: any): void {
        const request = this.pendingRequests.get(requestId);
        if (!request) {
            console.warn(`⚠️ 알 수 없는 요청 ID: ${requestId}`);
            return;
        }

        // 타임아웃 정리
        if (request.timeout) {
            clearTimeout(request.timeout);
        }

        // 사용자 통계 업데이트
        if (request.userId) {
            this.updateUserStats(request.userId, 'error');
        }

        // 요청 실패
        request.reject(error);
        this.pendingRequests.delete(requestId);

        console.log(`❌ 요청 실패: ${requestId}, 에러: ${error.message}`);
    }

    /**
     * 요청 제거
     * 
     * @param requestId 요청 ID
     */
    private removeRequest(requestId: string): void {
        const request = this.pendingRequests.get(requestId);
        if (request && request.timeout) {
            clearTimeout(request.timeout);
        }
        this.pendingRequests.delete(requestId);
    }

    /**
     * 사용자 통계 업데이트
     * 
     * @param userId 사용자 ID
     * @param type 업데이트 타입
     * @param responseTime 응답 시간 (선택적)
     */
    private updateUserStats(userId: string, type: 'request' | 'response' | 'error', responseTime?: number): void {
        let stats = this.userStats.get(userId);

        if (!stats) {
            stats = {
                userId,
                totalRequests: 0,
                pendingRequests: 0,
                lastRequestTime: Date.now(),
                averageResponseTime: 0
            };
            this.userStats.set(userId, stats);
        }

        switch (type) {
            case 'request':
                stats.totalRequests++;
                stats.pendingRequests++;
                stats.lastRequestTime = Date.now();
                break;
            case 'response':
                stats.pendingRequests--;
                if (responseTime) {
                    // 이동 평균 계산
                    stats.averageResponseTime = stats.averageResponseTime === 0
                        ? responseTime
                        : (stats.averageResponseTime + responseTime) / 2;
                }
                break;
            case 'error':
                stats.pendingRequests--;
                break;
        }
    }

    /**
     * 사용자별 진행 중인 요청 조회
     * 
     * @param userId 사용자 ID
     * @returns 진행 중인 요청 목록
     */
    getPendingRequestsByUser(userId: string): PendingRequest[] {
        return Array.from(this.pendingRequests.values())
            .filter(req => req.userId === userId);
    }

    /**
     * 세션별 진행 중인 요청 조회
     * 
     * @param sessionId 세션 ID
     * @returns 진행 중인 요청 목록
     */
    getPendingRequestsBySession(sessionId: string): PendingRequest[] {
        return Array.from(this.pendingRequests.values())
            .filter(req => req.sessionId === sessionId);
    }

    /**
     * 사용자 통계 조회
     * 
     * @param userId 사용자 ID
     * @returns 사용자 요청 통계
     */
    getUserStats(userId: string): UserRequestStats | undefined {
        return this.userStats.get(userId);
    }

    /**
     * 전체 시스템 통계 조회
     * 
     * @returns 시스템 통계
     */
    getSystemStats(): {
        totalPendingRequests: number;
        totalUsers: number;
        userStats: UserRequestStats[];
    } {
        return {
            totalPendingRequests: this.pendingRequests.size,
            totalUsers: this.userStats.size,
            userStats: Array.from(this.userStats.values())
        };
    }

    /**
     * 세션 정리 (사용자 로그아웃 시)
     * 
     * @param sessionId 정리할 세션 ID
     */
    cleanupSession(sessionId: string): void {
        const sessionRequests = this.getPendingRequestsBySession(sessionId);

        for (const request of sessionRequests) {
            this.failRequest(request.requestId, new Error('Session terminated'));
        }

        console.log(`🧹 세션 요청 정리 완료: ${sessionId} (${sessionRequests.length}개 요청)`);
    }

    /**
     * 사용자 정리 (비활성 사용자)
     * 
     * @param userId 정리할 사용자 ID
     */
    cleanupUser(userId: string): void {
        const userRequests = this.getPendingRequestsByUser(userId);

        for (const request of userRequests) {
            this.failRequest(request.requestId, new Error('User session terminated'));
        }

        this.userStats.delete(userId);

        console.log(`🧹 사용자 요청 정리 완료: ${userId} (${userRequests.length}개 요청)`);
    }
}

// 전역 요청 추적기 인스턴스
export const requestTracker = new RequestTracker();