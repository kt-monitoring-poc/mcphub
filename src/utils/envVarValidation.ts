import { Pool } from 'pg';
import { loadSettings } from '../config/index.js';
import { extractUserEnvVars } from './variableDetection.js';

export interface ValidationResult {
    isValid: boolean;
    issues: ValidationIssue[];
    summary: {
        totalServers: number;
        totalEnvVars: number;
        totalUsers: number;
        usersWithTokens: number;
        orphanedKeys: string[];
        missingKeys: string[];
    };
}

export interface ValidationIssue {
    type: 'ORPHANED_KEY' | 'MISSING_KEY' | 'INVALID_KEY_FORMAT' | 'DB_INCONSISTENCY';
    severity: 'ERROR' | 'WARNING' | 'INFO';
    message: string;
    details?: any;
}

export const validateEnvVarMapping = async (): Promise<ValidationResult> => {
    const issues: ValidationIssue[] = [];

    try {
        const settings = loadSettings();
        const currentEnvVars = new Set<string>();

        if (settings?.mcpServers) {
            Object.entries(settings.mcpServers).forEach(([serverName, serverConfig]) => {
                const serverEnvVars = extractUserEnvVars(serverConfig);
                serverEnvVars.forEach(varName => {
                    currentEnvVars.add(varName);
                });
            });
        }

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

        const allStoredKeys = new Set<string>();
        let usersWithTokens = 0;

        result.rows.forEach(row => {
            const serviceTokens = row.serviceTokens || {};
            const userKeys = Object.keys(serviceTokens);

            if (userKeys.length > 0) {
                usersWithTokens++;
            }

            userKeys.forEach(key => {
                allStoredKeys.add(key);
                if (!currentEnvVars.has(key)) {
                    issues.push({
                        type: 'ORPHANED_KEY',
                        severity: 'WARNING',
                        message: `사용자 ${row.githubUsername}의 키 ${key}가 더 이상 사용되지 않습니다.`,
                        details: {
                            userId: row.userId,
                            githubUsername: row.githubUsername,
                            key,
                            hasValue: serviceTokens[key] !== null && serviceTokens[key] !== ''
                        }
                    });
                }
            });
        });

        await pool.end();

        const missingKeys: string[] = [];
        currentEnvVars.forEach(varName => {
            if (!allStoredKeys.has(varName)) {
                missingKeys.push(varName);
                issues.push({
                    type: 'MISSING_KEY',
                    severity: 'INFO',
                    message: `환경변수 ${varName}가 아직 사용자들에 의해 설정되지 않았습니다.`,
                    details: { varName }
                });
            }
        });

        const orphanedKeys = Array.from(allStoredKeys).filter(key =>
            !currentEnvVars.has(key)
        );

        const summary = {
            totalServers: Object.keys(settings?.mcpServers || {}).length,
            totalEnvVars: currentEnvVars.size,
            totalUsers: result.rows.length,
            usersWithTokens,
            orphanedKeys,
            missingKeys
        };

        const isValid = !issues.some(issue => issue.severity === 'ERROR');

        return {
            isValid,
            issues,
            summary
        };

    } catch (error) {
        issues.push({
            type: 'DB_INCONSISTENCY',
            severity: 'ERROR',
            message: `환경변수 검증 중 오류 발생: ${error}`,
            details: { error: String(error) }
        });

        return {
            isValid: false,
            issues,
            summary: {
                totalServers: 0,
                totalEnvVars: 0,
                totalUsers: 0,
                usersWithTokens: 0,
                orphanedKeys: [],
                missingKeys: []
            }
        };
    }
};

export const printValidationReport = (result: ValidationResult): void => {
    console.log('\n🔍 환경변수 매핑 검증 결과\n' + '='.repeat(50));

    console.log(`📊 **시스템 요약**`);
    console.log(`   - MCP 서버: ${result.summary.totalServers}개`);
    console.log(`   - 환경변수: ${result.summary.totalEnvVars}개`);
    console.log(`   - 총 사용자: ${result.summary.totalUsers}명`);
    console.log(`   - 토큰 보유 사용자: ${result.summary.usersWithTokens}명`);

    if (result.isValid) {
        console.log('\n✅ **검증 성공**: 환경변수 매핑이 올바릅니다.');
    } else {
        console.log('\n❌ **검증 실패**: 문제가 발견되었습니다.');
    }

    const errorIssues = result.issues.filter(i => i.severity === 'ERROR');
    const warningIssues = result.issues.filter(i => i.severity === 'WARNING');
    const infoIssues = result.issues.filter(i => i.severity === 'INFO');

    if (errorIssues.length > 0) {
        console.log(`\n🚨 **오류 (${errorIssues.length}개):**`);
        errorIssues.forEach(issue => {
            console.log(`   - ${issue.message}`);
        });
    }

    if (warningIssues.length > 0) {
        console.log(`\n⚠️  **경고 (${warningIssues.length}개):**`);
        warningIssues.forEach(issue => {
            console.log(`   - ${issue.message}`);
        });
    }

    if (infoIssues.length > 0) {
        console.log(`\n💡 **정보 (${infoIssues.length}개):**`);
        infoIssues.forEach(issue => {
            console.log(`   - ${issue.message}`);
        });
    }

    if (result.summary.orphanedKeys.length > 0) {
        console.log(`\n🧹 **정리 제안:**`);
        console.log(`   다음 명령어로 고아 키들을 정리할 수 있습니다:`);
        console.log(`   npm run cleanup-env-vars`);
        console.log(`   (또는 개발 모드에서 시뮬레이션: npm run cleanup-env-vars -- --dry-run)`);
    }

    console.log('\n' + '='.repeat(50));
};

export const quickValidation = async (): Promise<boolean> => {
    try {
        const result = await validateEnvVarMapping();
        const hasErrors = result.issues.some(issue => issue.severity === 'ERROR');

        if (hasErrors) {
            console.warn('⚠️  환경변수 매핑에 오류가 있습니다. npm run validate-env-vars 명령어로 자세한 정보를 확인하세요.');
            return false;
        }

        const orphanedCount = result.summary.orphanedKeys.length;
        if (orphanedCount > 0) {
            console.info(`💡 ${orphanedCount}개의 사용되지 않는 환경변수가 있습니다. (npm run validate-env-vars로 확인)`);
        }

        return true;
    } catch (error) {
        console.warn(`환경변수 검증 실패: ${error}`);
        return false;
    }
};