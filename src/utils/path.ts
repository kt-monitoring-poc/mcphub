/**
 * 경로 관리 유틸리티
 * 
 * 설정 파일 경로를 찾고 관리하는 유틸리티 함수를 제공합니다.
 * 다양한 위치에서 설정 파일을 검색하고 적절한 경로를 반환합니다.
 * 
 * 주요 기능:
 * - 환경 변수 기반 설정 파일 경로 탐색
 * - 다중 경로 우선순위 검색
 * - 기본 경로 폴백 지원
 * - npx 실행 환경 고려
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Project root directory should be the parent directory of src
const rootDir = dirname(dirname(__dirname));

/**
 * 설정 파일의 경로를 찾기 위해 여러 가능한 위치를 확인합니다
 * 
 * 다음 순서로 파일을 검색합니다:
 * 1. MCPHUB_SETTING_PATH 환경 변수 경로
 * 2. 현재 작업 디렉토리(process.cwd())
 * 3. 프로젝트 루트 디렉토리
 * 4. npx 실행을 고려한 상위 디렉토리
 * 
 * @param {string} filename - 찾을 파일명 (예: 'servers.json', 'mcp_settings.json')
 * @param {string} [description='Configuration'] - 로깅 목적의 파일에 대한 간단한 설명
 * @returns {string} 파일의 경로
 * 
 * @example
 * ```typescript
 * const serversPath = getConfigFilePath('servers.json', 'MCP servers configuration');
 * const settingsPath = getConfigFilePath('mcp_settings.json');
 * ```
 */
export const getConfigFilePath = (filename: string, description = 'Configuration'): string => {
  const envPath = process.env.MCPHUB_SETTING_PATH;
  const potentialPaths = [
    ...(envPath ? [envPath] : []),
    // process.cwd()를 첫 번째 확인 위치로 우선순위 부여
    path.resolve(process.cwd(), filename),
    // 루트 디렉토리를 기준으로 한 상대 경로 사용
    path.join(rootDir, filename),
    // npx로 설치된 경우 한 단계 위를 확인해야 할 수 있음
    path.join(dirname(rootDir), filename)
  ];

  for (const filePath of potentialPaths) {
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  // 모든 경로에 파일이 존재하지 않으면 기본 경로 사용
  // 기본 경로 사용은 설정 파일이 누락된 경우에도 애플리케이션이 계속 진행할 수 있도록
  // 보장하기 때문에 허용됩니다. 이 폴백은 특히 개발 환경이나 파일이 선택사항일 때 유용합니다.
  const defaultPath = path.resolve(process.cwd(), filename);
  console.debug(`${description} file not found at any expected location, using default path: ${defaultPath}`);
  return defaultPath;
};