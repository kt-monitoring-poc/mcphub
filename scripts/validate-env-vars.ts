/**
 * 환경변수 매핑 검증 스크립트
 */

import { printValidationReport, validateEnvVarMapping } from '../src/utils/envVarValidation.js';

const main = async () => {
    try {
        console.log('🔍 환경변수 매핑 검증을 시작합니다...');

        const result = await validateEnvVarMapping();

        // 결과 출력
        printValidationReport(result);

        // 종료 코드 설정
        process.exit(result.isValid ? 0 : 1);

    } catch (error) {
        console.error('❌ 검증 실패:', error);
        process.exit(1);
    }
};

main();