/**
 * 환경변수 사용 현황 보고서 생성 스크립트
 */

import { Pool } from 'pg';
import { loadSettings } from '../src/config/index.js';
import { extractUserEnvVars } from '../src/utils/variableDetection.js';

interface ServerEnvVarStats {
    serverName: string;
    envVars: string[];
    usersWithValues: number;
    totalUsers: number;
    usagePercentage: number;
}

interface EnvVarUsageStats {
    varName: string;
    usersWithValues: number;
    totalUsers: number;
    usagePercentage: number;
    associatedServers: string[];
}

const main = async () => {
    try {
        console.log('📊 환경변수 사용 현황 보고서를 생성합니다...\n');

        // 1. mcp_settings.json에서 서버별 환경변수 추출
        const settings = loadSettings();
        const serverStats: ServerEnvVarStats[] = [];
        const allEnvVars = new Map<string, string[]>(); // varName -> serverNames

        if (settings?.mcpServers) {
            Object.entries(settings.mcpServers).forEach(([serverName, serverConfig]) => {
                const envVars = extractUserEnvVars(serverConfig);

                serverStats.push({
                    serverName,
                    envVars,
                    usersWithValues: 0, // DB에서 계산할 예정
                    totalUsers: 0,
                    usagePercentage: 0
                });

                // 환경변수별 서버 매핑
                envVars.forEach(varName => {
                    if (!allEnvVars.has(varName)) {
                        allEnvVars.set(varName, []);
                    }
                    allEnvVars.get(varName)!.push(serverName);
                });
            });
        }

        // 2. DB에서 사용자별 환경변수 사용 현황 조회
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mcphub'
        });

        const result = await pool.query(`
      SELECT 
        mk.id,
        mk."userId",
        mk."serviceTokens",
        u."githubUsername",
        u."isActive" as user_active
      FROM mcphub_keys mk
      JOIN users u ON mk."userId" = u.id
      WHERE mk."isActive" = true
      ORDER BY u."githubUsername"
    `);

        const totalUsers = result.rows.length;

        // 3. 환경변수별 사용 통계 계산
        const envVarStats: EnvVarUsageStats[] = [];

        allEnvVars.forEach((associatedServers, varName) => {
            let usersWithValues = 0;

            result.rows.forEach(row => {
                const serviceTokens = row.serviceTokens || {};
                const hasValue = serviceTokens[varName] &&
                    serviceTokens[varName].trim() !== '';
                if (hasValue) {
                    usersWithValues++;
                }
            });

            envVarStats.push({
                varName,
                usersWithValues,
                totalUsers,
                usagePercentage: totalUsers > 0 ? (usersWithValues / totalUsers) * 100 : 0,
                associatedServers
            });
        });

        // 4. 서버별 통계 계산
        serverStats.forEach(serverStat => {
            let serverUsersWithAnyValue = 0;

            result.rows.forEach(row => {
                const serviceTokens = row.serviceTokens || {};
                const hasAnyServerValue = serverStat.envVars.some(varName =>
                    serviceTokens[varName] && serviceTokens[varName].trim() !== ''
                );

                if (hasAnyServerValue) {
                    serverUsersWithAnyValue++;
                }
            });

            serverStat.usersWithValues = serverUsersWithAnyValue;
            serverStat.totalUsers = totalUsers;
            serverStat.usagePercentage = totalUsers > 0 ? (serverUsersWithAnyValue / totalUsers) * 100 : 0;
        });

        await pool.end();

        // 5. 보고서 출력
        console.log('📈 **MCPHub 환경변수 사용 현황 보고서**');
        console.log('='.repeat(60));

        console.log(`\n📊 **전체 요약**`);
        console.log(`   - 총 MCP 서버: ${serverStats.length}개`);
        console.log(`   - 총 환경변수: ${envVarStats.length}개`);
        console.log(`   - 총 사용자: ${totalUsers}명`);

        // 6. 서버별 사용률 (사용률 높은 순으로 정렬)
        console.log(`\n🖥️  **서버별 환경변수 사용률**`);
        const sortedServerStats = [...serverStats].sort((a, b) => b.usagePercentage - a.usagePercentage);

        sortedServerStats.forEach(server => {
            console.log(`   ${server.serverName}: ${server.usagePercentage.toFixed(1)}% (${server.usersWithValues}/${server.totalUsers}명)`);
            console.log(`      필요 환경변수: ${server.envVars.join(', ')}`);
        });

        // 7. 환경변수별 사용률 (사용률 높은 순으로 정렬)
        console.log(`\n🔑 **환경변수별 사용률**`);
        const sortedEnvVarStats = [...envVarStats].sort((a, b) => b.usagePercentage - a.usagePercentage);

        sortedEnvVarStats.forEach(envVar => {
            console.log(`   ${envVar.varName}: ${envVar.usagePercentage.toFixed(1)}% (${envVar.usersWithValues}/${envVar.totalUsers}명)`);
            console.log(`      사용 서버: ${envVar.associatedServers.join(', ')}`);
        });

        // 8. 사용되지 않는 환경변수 (사용률 0%)
        const unusedVars = envVarStats.filter(v => v.usagePercentage === 0);
        if (unusedVars.length > 0) {
            console.log(`\n⚠️  **사용되지 않는 환경변수 (${unusedVars.length}개)**`);
            unusedVars.forEach(envVar => {
                console.log(`   ${envVar.varName} (${envVar.associatedServers.join(', ')})`);
            });
        }

        // 9. 사용자별 상세 정보 (옵션)
        if (process.argv.includes('--detailed')) {
            console.log(`\n👤 **사용자별 환경변수 보유 현황**`);
            result.rows.forEach(row => {
                const serviceTokens = row.serviceTokens || {};
                const userVars = Object.keys(serviceTokens).filter(key =>
                    key.startsWith('USER_') && serviceTokens[key] && serviceTokens[key].trim() !== ''
                );

                console.log(`   ${row.githubUsername}: ${userVars.length}개 변수`);
                if (userVars.length > 0) {
                    console.log(`      보유: ${userVars.join(', ')}`);
                }
            });
        }

        // 10. 권장사항
        console.log(`\n💡 **권장사항**`);

        const lowUsageServers = serverStats.filter(s => s.usagePercentage < 20 && s.usagePercentage > 0);
        if (lowUsageServers.length > 0) {
            console.log(`   - 사용률이 낮은 서버들의 환경변수 설정 가이드 제공 필요:`);
            lowUsageServers.forEach(s => console.log(`     ${s.serverName} (${s.usagePercentage.toFixed(1)}%)`));
        }

        if (unusedVars.length > 0) {
            console.log(`   - 사용되지 않는 환경변수들의 문서 확인 및 예제 제공 필요`);
        }

        const highUsageVars = envVarStats.filter(v => v.usagePercentage > 80);
        if (highUsageVars.length > 0) {
            console.log(`   - 높은 사용률의 환경변수들은 잘 설정되어 있습니다:`);
            highUsageVars.forEach(v => console.log(`     ${v.varName} (${v.usagePercentage.toFixed(1)}%)`));
        }

        console.log('\n' + '='.repeat(60));
        console.log('💡 --detailed 옵션으로 사용자별 상세 정보를 확인할 수 있습니다.');

    } catch (error) {
        console.error('❌ 보고서 생성 실패:', error);
        process.exit(1);
    }
};

main();