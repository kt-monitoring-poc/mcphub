/**
 * 버전 관리 유틸리티
 * 
 * 애플리케이션의 버전 정보를 관리하는 유틸리티 함수를 제공합니다.
 * package.json에서 버전 정보를 읽어오는 기능을 포함합니다.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM 환경에서 디렉토리 이름 가져오기
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * package.json에서 패키지 버전을 가져옵니다
 * 
 * 프로젝트 루트의 package.json 파일을 읽어서 버전 정보를 반환합니다.
 * 파일을 읽는 데 실패하거나 버전 정보가 없으면 'dev'를 반환합니다.
 * 
 * @returns {string} package.json의 버전 문자열, 또는 찾지 못한 경우 'dev'
 * 
 * @example
 * ```typescript
 * const version = getPackageVersion();
 * console.log(`현재 버전: ${version}`); // "현재 버전: 1.0.0"
 * ```
 */
export const getPackageVersion = (): string => {
  try {
    const packageJsonPath = path.resolve(__dirname, '../../package.json');
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    return packageJson.version || 'dev';
  } catch (error) {
    console.error('Error reading package version:', error);
    return 'dev';
  }
};
