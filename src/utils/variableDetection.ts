/**
 * 변수 탐지 유틸리티 (백엔드)
 * 
 * 서버 설정에서 환경 변수 패턴(${변수명})을 탐지하는 유틸리티입니다.
 * 중첩된 객체와 배열을 재귀적으로 탐색하여 모든 변수 참조를 찾습니다.
 * 
 * 주요 기능:
 * - ${변수명} 패턴 탐지
 * - 중첩된 객체/배열 재귀 탐색
 * - 중복 변수 제거
 * - 다양한 데이터 타입 지원
 */

/**
 * 서버 설정에서 ${} 변수를 탐지하는 유틸리티 함수
 * 
 * 주어진 객체를 재귀적으로 탐색하여 ${변수명} 형태의 환경 변수 참조를
 * 모두 찾아서 배열로 반환합니다. 중복된 변수명은 자동으로 제거됩니다.
 * 
 * @param {any} payload - 탐색할 데이터 (객체, 배열, 문자열 등)
 * @returns {string[]} 탐지된 변수명들의 배열 (중복 제거됨)
 * 
 * @example
 * ```typescript
 * const config = {
 *   host: "${DB_HOST}",
 *   port: "${DB_PORT}",
 *   auth: {
 *     username: "${DB_USER}",
 *     password: "${DB_PASSWORD}"
 *   },
 *   connections: ["${DB_HOST}:${DB_PORT}", "localhost:5432"]
 * };
 * 
 * const variables = detectVariables(config);
 * console.log(variables); // ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD"]
 * ```
 */
export const detectVariables = (payload: any): string[] => {
    const variables = new Set<string>();
    const variableRegex = /\$\{([^}]+)\}/g;

    /**
     * 문자열에서 변수 패턴을 찾아 추가합니다
     * 
     * @param {string} str - 검사할 문자열
     */
    const checkString = (str: string) => {
        let match;
        while ((match = variableRegex.exec(str)) !== null) {
            variables.add(match[1]);
        }
    };

    /**
     * 객체를 재귀적으로 탐색하여 변수를 찾습니다
     * 
     * @param {any} obj - 탐색할 객체
     * @param {string} path - 현재 경로 (디버깅용, 현재는 미사용)
     */
    const checkObject = (obj: any, path: string = '') => {
        if (typeof obj === 'string') {
            checkString(obj);
        } else if (Array.isArray(obj)) {
            obj.forEach((item, index) => checkObject(item, `${path}[${index}]`));
        } else if (obj && typeof obj === 'object') {
            Object.entries(obj).forEach(([key, value]) => {
                checkObject(value, path ? `${path}.${key}` : key);
            });
        }
    };

    checkObject(payload);
    return Array.from(variables);
};

/**
 * MCP 서버 설정에서 사용자 환경변수 템플릿을 추출합니다
 * 
 * @param {any} serverConfig - MCP 서버 설정 객체
 * @returns {string[]} 사용자 환경변수 템플릿 배열
 */
export const extractUserEnvVars = (serverConfig: any): string[] => {
    const variables = new Set<string>();

    // 1. ${변수명} 패턴 감지 - 모든 환경변수 포함
    const templateVars = detectVariables(serverConfig);

    // 사용자별 토큰으로 간주할 변수 패턴들
    const userTokenPatterns = [
        /^USER_/,           // USER_로 시작하는 변수
        /^GITHUB_TOKEN$/,   // GitHub 토큰
        /^FIRECRAWL_TOKEN$/, // Firecrawl 토큰
        /^ATLASSIAN_.*_TOKEN$/, // Atlassian 토큰들
        /^ATLASSIAN_.*_EMAIL$/, // Atlassian 이메일들
        /^ATLASSIAN_.*_URL$/    // Atlassian URL들
    ];

    // 패턴에 맞는 변수들만 필터링
    templateVars.forEach(varName => {
        if (userTokenPatterns.some(pattern => pattern.test(varName))) {
            variables.add(varName);
        }
    });

    // 2. env 필드에 직접 정의된 환경변수 감지
    if (serverConfig.env && typeof serverConfig.env === 'object') {
        Object.keys(serverConfig.env).forEach(key => {
            if (userTokenPatterns.some(pattern => pattern.test(key))) {
                variables.add(key);
            }
        });
    }

    return Array.from(variables);
};

/**
 * 서버 설정에서 환경변수를 실제 값으로 치환합니다
 * 
 * @param {any} serverConfig - 원본 서버 설정
 * @param {Record<string, string>} envVars - 환경변수 값들
 * @returns {any} 치환된 서버 설정
 */
export const replaceEnvVars = (serverConfig: any, envVars: Record<string, string>): any => {
    if (typeof serverConfig === 'string') {
        return serverConfig.replace(/\$\{([^}]+)\}/g, (match, varName) => {
            return envVars[varName] || match;
        });
    } else if (Array.isArray(serverConfig)) {
        return serverConfig.map(item => replaceEnvVars(item, envVars));
    } else if (serverConfig && typeof serverConfig === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(serverConfig)) {
            result[key] = replaceEnvVars(value, envVars);
        }
        return result;
    }
    return serverConfig;
}; 