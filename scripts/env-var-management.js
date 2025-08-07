#!/usr/bin/env node

/**
 * 환경변수 관리 CLI 도구
 * 
 * 환경변수 검증, 정리, 보고서 생성 등의 관리 작업을 수행합니다.
 */

import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// TypeScript 파일을 직접 실행하기 위한 헬퍼
const runTsScript = (scriptPath, args = []) => {
    return new Promise((resolve, reject) => {
        const fullScriptPath = path.join(__dirname, '..', scriptPath);
        const command = `tsx ${fullScriptPath} ${args.join(' ')}`;

        console.log(`실행: ${command}`);

        const child = exec(command, {
            cwd: path.join(__dirname, '..')
        });

        child.stdout.on('data', (data) => process.stdout.write(data));
        child.stderr.on('data', (data) => process.stderr.write(data));

        child.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`스크립트 실행 실패 (exit code: ${code})`));
            }
        });
    });
};

const main = async () => {
    const command = process.argv[2];
    const args = process.argv.slice(3);

    try {
        switch (command) {
            case 'validate':
                console.log('🔍 환경변수 매핑 검증을 시작합니다...\n');
                await runTsScript('scripts/validate-env-vars.ts', args);
                break;

            case 'cleanup':
                console.log('🧹 환경변수 정리를 시작합니다...\n');
                await runTsScript('scripts/cleanup-env-vars.ts', args);
                break;

            case 'report':
                console.log('📊 환경변수 사용 보고서를 생성합니다...\n');
                await runTsScript('scripts/env-var-report.ts', args);
                break;

            case 'help':
            default:
                console.log(`
MCPHub 환경변수 관리 도구

사용법:
  node scripts/env-var-management.js <command> [options]

명령어:
  validate    환경변수 매핑 검증
  cleanup     사용되지 않는 환경변수 정리
  report      환경변수 사용 현황 보고서
  help        이 도움말 표시

옵션:
  --dry-run   실제 변경 없이 시뮬레이션만 실행 (cleanup에서 사용)

예제:
  node scripts/env-var-management.js validate
  node scripts/env-var-management.js cleanup --dry-run
  node scripts/env-var-management.js cleanup
  node scripts/env-var-management.js report
        `);
                break;
        }
    } catch (error) {
        console.error(`❌ 오류: ${error.message}`);
        process.exit(1);
    }
};

main();