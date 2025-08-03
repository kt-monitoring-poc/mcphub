/**
 * 업스트림 MCP 서버와의 사용자 컨텍스트 전파 시스템
 * 
 * MCPHub에서 업스트림 MCP 서버들로 사용자 정보와 세션을 전달하여
 * 사용자별 격리와 권한 제어를 가능하게 합니다.
 */

import { requestTracker } from './requestTracker.js';

/**
 * 업스트림 전달 사용자 컨텍스트
 */
export interface UpstreamUserContext {
    userId: string;
    userSessionId: string;
    mcpHubSessionId: string;
    userServiceTokens: Record<string, string>;
    requestId: string;
    timestamp: number;
    userGroups?: string[];
}

/**
 * 업스트림 요청 헤더 생성기
 */
export class UpstreamContextPropagator {

    /**
     * 사용자별 업스트림 헤더 생성
     * 
     * @param userContext 사용자 컨텍스트
     * @param serverName 업스트림 서버명
     * @returns 업스트림 전송용 헤더
     */
    generateUpstreamHeaders(
        userContext: UpstreamUserContext,
        serverName: string
    ): Record<string, string> {
        const headers: Record<string, string> = {
            // 사용자 식별 정보
            'X-MCPHub-User-Id': userContext.userId,
            'X-MCPHub-User-Session-Id': userContext.userSessionId,
            'X-MCPHub-Session-Id': userContext.mcpHubSessionId,
            'X-MCPHub-Request-Id': userContext.requestId,

            // 시간 정보 (요청 순서 및 타임아웃 처리용)
            'X-MCPHub-Timestamp': userContext.timestamp.toString(),

            // 서버 정보
            'X-MCPHub-Source-Server': serverName,
            'X-MCPHub-Protocol-Version': '2025-06-18',

            // 사용자 그룹 정보 (있는 경우)
            ...(userContext.userGroups && userContext.userGroups.length > 0 && {
                'X-MCPHub-User-Groups': userContext.userGroups.join(',')
            })
        };

        // 사용자별 서비스 토큰 전파
        this.addServiceTokenHeaders(headers, userContext.userServiceTokens, serverName);

        return headers;
    }

    /**
     * 서비스별 토큰 헤더 추가
     * 
     * @param headers 기본 헤더 객체
     * @param userServiceTokens 사용자 서비스 토큰
     * @param serverName 서버명
     */
    private addServiceTokenHeaders(
        headers: Record<string, string>,
        userServiceTokens: Record<string, string>,
        serverName: string
    ): void {
        // GitHub 관련 토큰
        if (userServiceTokens.GITHUB_TOKEN) {
            headers['X-MCPHub-GitHub-Token'] = userServiceTokens.GITHUB_TOKEN;
        }

        // Atlassian 관련 토큰들
        if (userServiceTokens.ATLASSIAN_TOKEN) {
            headers['X-MCPHub-Atlassian-Token'] = userServiceTokens.ATLASSIAN_TOKEN;
        }
        if (userServiceTokens.JIRA_API_TOKEN) {
            headers['X-MCPHub-Jira-Token'] = userServiceTokens.JIRA_API_TOKEN;
        }

        // Firecrawl 토큰
        if (userServiceTokens.FIRECRAWL_TOKEN) {
            headers['X-MCPHub-Firecrawl-Token'] = userServiceTokens.FIRECRAWL_TOKEN;
        }

        // 서버별 특화 토큰 처리
        const serverSpecificToken = userServiceTokens[`${serverName.toUpperCase()}_TOKEN`];
        if (serverSpecificToken) {
            headers[`X-MCPHub-${serverName}-Token`] = serverSpecificToken;
        }

        console.log(`🔐 업스트림 토큰 헤더 생성 (${serverName}): ${Object.keys(headers).filter(h => h.includes('Token')).length}개`);
    }

    /**
     * 사용자 컨텍스트 생성
     * 
     * @param userId 사용자 ID
     * @param sessionId MCPHub 세션 ID
     * @param userServiceTokens 사용자 서비스 토큰
     * @param method 요청 메서드
     * @param userGroups 사용자 그룹 (선택적)
     * @returns 사용자 컨텍스트 및 요청 추적 정보
     */
    createUserContext(
        userId: string,
        sessionId: string,
        userServiceTokens: Record<string, string>,
        method: string,
        userGroups?: string[]
    ): {
        context: UpstreamUserContext;
        trackingInfo: { requestId: string; promise: Promise<any> };
    } {
        // 사용자별 세션 ID 생성
        const userSessionId = requestTracker.generateUserSessionId(sessionId, userId);

        // 요청 추적 시작
        const trackingInfo = requestTracker.trackRequest(sessionId, method, userId, userServiceTokens);

        const context: UpstreamUserContext = {
            userId,
            userSessionId,
            mcpHubSessionId: sessionId,
            userServiceTokens,
            requestId: trackingInfo.requestId,
            timestamp: Date.now(),
            userGroups
        };

        console.log(`👤 사용자 컨텍스트 생성: ${userId} (세션: ${userSessionId.substring(0, 16)}...)`);

        return { context, trackingInfo };
    }

    /**
     * 업스트림 응답 처리
     * 
     * @param requestId 요청 ID
     * @param response 업스트림 응답
     * @param error 에러 (있는 경우)
     */
    handleUpstreamResponse(requestId: string, response?: any, error?: any): void {
        if (error) {
            console.log(`❌ 업스트림 응답 에러: ${requestId} - ${error.message}`);
            requestTracker.failRequest(requestId, error);
        } else {
            console.log(`✅ 업스트림 응답 완료: ${requestId}`);
            requestTracker.completeRequest(requestId, response);
        }
    }

    /**
     * 사용자 식별 정보 추출 (업스트림 서버용)
     * 
     * @param headers 요청 헤더
     * @returns 사용자 식별 정보
     */
    extractUserInfoFromHeaders(headers: Record<string, string>): {
        userId?: string;
        userSessionId?: string;
        mcpHubSessionId?: string;
        requestId?: string;
        timestamp?: number;
        userGroups?: string[];
    } {
        return {
            userId: headers['X-MCPHub-User-Id'],
            userSessionId: headers['X-MCPHub-User-Session-Id'],
            mcpHubSessionId: headers['X-MCPHub-Session-Id'],
            requestId: headers['X-MCPHub-Request-Id'],
            timestamp: headers['X-MCPHub-Timestamp'] ? parseInt(headers['X-MCPHub-Timestamp']) : undefined,
            userGroups: headers['X-MCPHub-User-Groups'] ? headers['X-MCPHub-User-Groups'].split(',') : undefined
        };
    }

    /**
     * 서비스 토큰 추출 (업스트림 서버용)
     * 
     * @param headers 요청 헤더
     * @returns 서비스별 토큰 맵
     */
    extractServiceTokensFromHeaders(headers: Record<string, string>): Record<string, string> {
        const tokens: Record<string, string> = {};

        // GitHub 토큰
        if (headers['X-MCPHub-GitHub-Token']) {
            tokens.GITHUB_TOKEN = headers['X-MCPHub-GitHub-Token'];
        }

        // Atlassian 토큰들
        if (headers['X-MCPHub-Atlassian-Token']) {
            tokens.ATLASSIAN_TOKEN = headers['X-MCPHub-Atlassian-Token'];
        }
        if (headers['X-MCPHub-Jira-Token']) {
            tokens.JIRA_API_TOKEN = headers['X-MCPHub-Jira-Token'];
        }

        // Firecrawl 토큰
        if (headers['X-MCPHub-Firecrawl-Token']) {
            tokens.FIRECRAWL_TOKEN = headers['X-MCPHub-Firecrawl-Token'];
        }

        // 기타 서버별 토큰
        Object.keys(headers).forEach(key => {
            if (key.startsWith('X-MCPHub-') && key.endsWith('-Token') && !key.includes('GitHub') && !key.includes('Atlassian') && !key.includes('Jira') && !key.includes('Firecrawl')) {
                const serverName = key.replace('X-MCPHub-', '').replace('-Token', '');
                tokens[`${serverName.toUpperCase()}_TOKEN`] = headers[key];
            }
        });

        return tokens;
    }

    /**
     * 디버그 정보 생성
     * 
     * @param userContext 사용자 컨텍스트
     * @param serverName 서버명
     * @returns 디버그 정보 문자열
     */
    generateDebugInfo(userContext: UpstreamUserContext, serverName: string): string {
        return [
            `👤 사용자: ${userContext.userId}`,
            `🔗 세션: ${userContext.userSessionId.substring(0, 16)}...`,
            `📋 요청: ${userContext.requestId.substring(0, 16)}...`,
            `🏷️ 서버: ${serverName}`,
            `🔑 토큰: ${Object.keys(userContext.userServiceTokens).length}개`,
            `👥 그룹: ${userContext.userGroups?.length || 0}개`
        ].join(' | ');
    }
}

// 전역 업스트림 컨텍스트 전파기 인스턴스
export const upstreamContextPropagator = new UpstreamContextPropagator();