/**
 * 환경변수 정리 스크립트
 */

import { loadSettings } from '../src/config/index.js';
import { cleanupObsoleteEnvVars, getCurrentEnvVars } from '../src/utils/envVarCleanup.js';

const main = async () => {
    try {
        const dryRun = process.argv.includes('--dry-run');
        const action = dryRun ? '시뮬레이션' : '실제 정리';

        console.log(`🧹 환경변수 ${action}을 시작합니다...`);

        // 현재 사용 중인 환경변수들 가져오기
        const settings = loadSettings();
        const currentEnvVars = getCurrentEnvVars(settings);

        console.log(`📋 현재 사용 중인 환경변수 ${currentEnvVars.length}개:`);
        console.log(`   ${currentEnvVars.join(', ')}`);
        console.log('');

        // 정리 실행
        const result = await cleanupObsoleteEnvVars(currentEnvVars, dryRun);

        if (result.success) {
            console.log(`✅ ${result.message}`);

            if (result.affectedUsers > 0) {
                console.log(`\n📊 **상세 정보:**`);
                console.log(`   - 영향받은 사용자: ${result.affectedUsers}명`);
                console.log(`   - 제거된 변수: ${result.removedVars.length}개`);

                if (result.removedVars.length > 0) {
                    console.log(`   - 변수 목록: ${result.removedVars.join(', ')}`);
                }

                if (dryRun) {
                    console.log(`\n💡 실제 정리를 하려면 --dry-run 옵션을 제거하고 다시 실행하세요.`);
                }
            } else {
                console.log(`\n💡 정리할 환경변수가 없습니다. 시스템이 깔끔합니다!`);
            }
        } else {
            console.error(`❌ ${result.message}`);
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ 정리 실패:', error);
        process.exit(1);
    }
};

main();