/**
 * 서버 설정에서 ${} 변수를 감지하는 유틸리티 함수
 * 
 * 이 함수는 서버 설정 객체에서 ${VARIABLE_NAME} 형태의 템플릿 변수들을 찾아서
 * 변수명 목록을 반환합니다. 이를 통해 사용자가 어떤 환경 변수나 설정 변수들을
 * 정의해야 하는지 알 수 있습니다.
 * 
 * 사용 예시:
 * ```javascript
 * const config = {
 *   host: '${DB_HOST}',
 *   port: '${DB_PORT}',
 *   credentials: {
 *     username: '${DB_USER}',
 *     password: '${DB_PASSWORD}'
 *   }
 * };
 * 
 * const variables = detectVariables(config);
 * // 결과: ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD']
 * ```
 * 
 * @param payload - 검사할 객체 (문자열, 배열, 객체 등 모든 타입 지원)
 * @returns 발견된 변수명들의 배열 (중복 제거됨)
 */
export const detectVariables = (payload: any): string[] => {
  // 중복을 제거하기 위해 Set을 사용
  const variables = new Set<string>();
  
  // ${VARIABLE_NAME} 형태의 변수를 찾는 정규식
  // ${} 안의 내용을 캡처 그룹으로 추출
  const variableRegex = /\$\{([^}]+)\}/g;

  /**
   * 문자열에서 변수를 찾는 내부 함수
   * @param str - 검사할 문자열
   */
  const checkString = (str: string) => {
    let match;
    // 정규식으로 모든 매치를 찾아서 변수명을 Set에 추가
    while ((match = variableRegex.exec(str)) !== null) {
      variables.add(match[1]);  // 캡처 그룹의 내용 (변수명)
    }
  };

  /**
   * 객체를 재귀적으로 검사하는 내부 함수
   * @param obj - 검사할 객체
   * @param path - 현재 검사 중인 경로 (디버깅용)
   */
  const checkObject = (obj: any, path: string = '') => {
    if (typeof obj === 'string') {
      // 문자열인 경우 직접 변수 검사
      checkString(obj);
    } else if (Array.isArray(obj)) {
      // 배열인 경우 각 요소를 재귀적으로 검사
      obj.forEach((item, index) => checkObject(item, `${path}[${index}]`));
    } else if (obj && typeof obj === 'object') {
      // 객체인 경우 각 속성을 재귀적으로 검사
      Object.entries(obj).forEach(([key, value]) => {
        checkObject(value, path ? `${path}.${key}` : key);
      });
    }
  };

  // 최상위 객체부터 검사 시작
  checkObject(payload);
  
  // Set을 배열로 변환하여 반환
  return Array.from(variables);
};
