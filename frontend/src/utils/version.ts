// NPM 레지스트리 URL (공식 NPM 레지스트리)
const NPM_REGISTRY = 'https://registry.npmjs.org';

// 패키지 이름 (NPM에서 관리되는 패키지명)
const PACKAGE_NAME = '@samanhappy/mcphub';

/**
 * NPM 레지스트리에서 최신 버전을 확인하는 함수
 * 
 * 이 함수는 NPM 레지스트리 API를 사용하여 현재 패키지의 최신 버전을 가져옵니다.
 * 사용자에게 업데이트 알림을 제공하거나 버전 비교에 사용할 수 있습니다.
 * 
 * @returns Promise<string | null> - 최신 버전 문자열 또는 null (오류 시)
 */
export const checkLatestVersion = async (): Promise<string | null> => {
  try {
    // NPM 레지스트리 API 엔드포인트 호출
    // /latest 엔드포인트는 해당 패키지의 최신 버전 정보를 반환합니다
    const response = await fetch(`${NPM_REGISTRY}/${PACKAGE_NAME}/latest`);
    
    // HTTP 응답이 성공적이지 않으면 오류 발생
    if (!response.ok) {
      throw new Error(`Failed to fetch latest version: ${response.status}`);
    }
    
    // JSON 응답을 파싱하여 버전 정보 추출
    const data = await response.json();
    return data.version || null;
  } catch (error) {
    // 네트워크 오류나 기타 예외 상황 처리
    console.error('Error checking for latest version:', error);
    return null;
  }
};

/**
 * 두 버전을 비교하는 함수
 * 
 * 시맨틱 버저닝(Semantic Versioning) 규칙에 따라 두 버전을 비교합니다.
 * major.minor.patch 형태의 버전 문자열을 비교하여:
 * - 현재 버전이 더 새면 -1 반환
 * - 최신 버전이 더 새면 1 반환
 * - 동일하면 0 반환
 * 
 * 사용 예시:
 * ```javascript
 * const result = compareVersions('1.2.3', '1.2.4');  // 1 (업데이트 필요)
 * const result = compareVersions('2.0.0', '1.9.9');  // -1 (현재가 더 최신)
 * const result = compareVersions('1.2.3', '1.2.3');  // 0 (동일)
 * ```
 * 
 * @param current - 현재 버전 (예: '1.2.3')
 * @param latest - 비교할 버전 (예: '1.2.4')
 * @returns number - 비교 결과 (-1: 현재가 더 최신, 1: 비교 버전이 더 최신, 0: 동일)
 */
export const compareVersions = (current: string, latest: string): number => {
  // 개발 버전('dev')은 항상 최신 버전보다 낮은 것으로 간주
  if (current === 'dev') return -1;
  
  // 버전 문자열을 점(.)으로 분리하여 숫자 배열로 변환
  // 예: '1.2.3' → [1, 2, 3]
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);

  // major, minor, patch 버전을 순차적으로 비교
  for (let i = 0; i < 3; i++) {
    // 각 부분이 없으면 0으로 처리 (예: '1.2' → [1, 2, 0])
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;

    // 현재 부분이 더 크면 현재 버전이 더 최신
    if (currentPart > latestPart) return -1;
    // 비교 버전 부분이 더 크면 비교 버전이 더 최신
    if (currentPart < latestPart) return 1;
    // 같으면 다음 부분으로 계속 비교
  }

  // 모든 부분이 동일하면 버전이 같음
  return 0;
};
