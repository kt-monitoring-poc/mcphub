/**
 * 환경변수 정리 유틸리티
 * 
 * MCP 서버가 제거되거나 환경변수 템플릿이 변경될 때
 * 사용자 DB에서 불필요한 환경변수들을 자동으로 정리합니다.
 */

import { Pool } from 'pg';
import { extractUserEnvVars } from './variableDetection.js';

/**
 * 현재 mcp_settings.json에서 사용 중인 모든 환경변수 목록을 반환
 */
export const getCurrentEnvVars = (mcpSettings: any): string[] => {
    const allEnvVars = new Set<string>();

    if (mcpSettings?.mcpServers) {
        Object.values(mcpSettings.mcpServers).forEach((serverConfig: any) => {
            const serverEnvVars = extractUserEnvVars(serverConfig);
            serverEnvVars.forEach(varName => allEnvVars.add(varName));
        });
    }

    return Array.from(allEnvVars);
};

/**
 * 사용자별로 불필요한 환경변수들을 정리
 */
export const cleanupObsoleteEnvVars = async (
    currentEnvVars: string[],
    dryRun: boolean = false
): Promise<{
    success: boolean;
    message: string;
    affectedUsers: number;
    removedVars: string[];
}> => {
    try {
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mcphub'
        });

        // 모든 활성 MCPHub 키에서 serviceTokens 조회
        const result = await pool.query(`
      SELECT 
        mk.id,
        mk."userId",
        mk."serviceTokens",
        u."githubUsername"
      FROM mcphub_keys mk
      JOIN users u ON mk."userId" = u.id
      WHERE mk."isActive" = true
      AND mk."serviceTokens" IS NOT NULL
    `);

        let affectedUsers = 0;
        const removedVars = new Set<string>();

        for (const row of result.rows) {
            const serviceTokens = row.serviceTokens || {};
            const currentKeys = Object.keys(serviceTokens);

            // 더 이상 사용되지 않는 USER_* 키들 찾기
            const obsoleteKeys = currentKeys.filter(key =>
                key.startsWith('USER_') && !currentEnvVars.includes(key)
            );

            if (obsoleteKeys.length > 0) {
                console.log(`👤 사용자 ${row.githubUsername}: 제거 대상 키 ${obsoleteKeys.length}개`);
                console.log(`   제거 키: ${obsoleteKeys.join(', ')}`);

                if (!dryRun) {
                    // 불필요한 키들 제거
                    const cleanedTokens = { ...serviceTokens };
                    obsoleteKeys.forEach(key => {
                        delete cleanedTokens[key];
                        removedVars.add(key);
                    });

                    // DB 업데이트
                    await pool.query(`
            UPDATE mcphub_keys 
            SET "serviceTokens" = $1, "updatedAt" = NOW()
            WHERE id = $2
          `, [JSON.stringify(cleanedTokens), row.id]);
                } else {
                    obsoleteKeys.forEach(key => removedVars.add(key));
                }

                affectedUsers++;
            }
        }

        await pool.end();

        const action = dryRun ? '분석 완료' : '정리 완료';
        const message = `환경변수 ${action}: ${affectedUsers}명의 사용자, ${removedVars.size}개 변수 처리`;

        return {
            success: true,
            message,
            affectedUsers,
            removedVars: Array.from(removedVars)
        };

    } catch (error) {
        console.error('환경변수 정리 실패:', error);
        return {
            success: false,
            message: `환경변수 정리 실패: ${error}`,
            affectedUsers: 0,
            removedVars: []
        };
    }
};

/**
 * MCP 서버 제거 시 관련 환경변수들 정리
 */
export const cleanupServerEnvVars = async (
    serverName: string,
    serverConfig: any,
    dryRun: boolean = false
): Promise<{
    success: boolean;
    message: string;
    affectedUsers: number;
    removedVars: string[];
}> => {
    try {
        // 제거되는 서버의 환경변수들 추출
        const serverEnvVars = extractUserEnvVars(serverConfig);

        if (serverEnvVars.length === 0) {
            return {
                success: true,
                message: `서버 ${serverName}에 정리할 환경변수가 없습니다.`,
                affectedUsers: 0,
                removedVars: []
            };
        }

        console.log(`🗑️  서버 ${serverName} 제거에 따른 환경변수 정리:`);
        console.log(`   대상 변수: ${serverEnvVars.join(', ')}`);

        const pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mcphub'
        });

        // 해당 환경변수들을 가진 사용자들 조회
        const result = await pool.query(`
      SELECT 
        mk.id,
        mk."userId",
        mk."serviceTokens",
        u."githubUsername"
      FROM mcphub_keys mk
      JOIN users u ON mk."userId" = u.id
      WHERE mk."isActive" = true
      AND mk."serviceTokens" IS NOT NULL
    `);

        let affectedUsers = 0;
        const removedVars = new Set<string>();

        for (const row of result.rows) {
            const serviceTokens = row.serviceTokens || {};

            // 제거 대상 키들 찾기
            const keysToRemove = serverEnvVars.filter(varName =>
                serviceTokens.hasOwnProperty(varName)
            );

            if (keysToRemove.length > 0) {
                console.log(`👤 사용자 ${row.githubUsername}: ${keysToRemove.length}개 키 제거`);

                if (!dryRun) {
                    // 키들 제거
                    const cleanedTokens = { ...serviceTokens };
                    keysToRemove.forEach(key => {
                        delete cleanedTokens[key];
                        removedVars.add(key);
                    });

                    // DB 업데이트
                    await pool.query(`
            UPDATE mcphub_keys 
            SET "serviceTokens" = $1, "updatedAt" = NOW()
            WHERE id = $2
          `, [JSON.stringify(cleanedTokens), row.id]);
                } else {
                    keysToRemove.forEach(key => removedVars.add(key));
                }

                affectedUsers++;
            }
        }

        await pool.end();

        const action = dryRun ? '분석' : '정리';
        const message = `서버 ${serverName} ${action} 완료: ${affectedUsers}명 사용자, ${removedVars.size}개 변수 처리`;

        return {
            success: true,
            message,
            affectedUsers,
            removedVars: Array.from(removedVars)
        };

    } catch (error) {
        console.error(`서버 ${serverName} 환경변수 정리 실패:`, error);
        return {
            success: false,
            message: `서버 환경변수 정리 실패: ${error}`,
            affectedUsers: 0,
            removedVars: []
        };
    }
};