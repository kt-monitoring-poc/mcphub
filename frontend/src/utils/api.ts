/**
 * API 유틸리티 함수들
 * 
 * 이 파일은 API URL을 구성하기 위한 유틸리티 함수들을 제공합니다.
 * 기본 경로(base path) 지원을 포함한 완전한 API URL을 생성합니다.
 *
 * ⚠️ 주의: 이 파일의 함수들은 deprecated(사용 중단)되었습니다.
 * 대신 utils/runtime.ts의 함수들을 사용하세요.
 * 런타임 설정 지원을 위해 runtime.ts의 함수들이 더 적합합니다.
 *
 * @deprecated Use functions from utils/runtime.ts instead for runtime configuration support
 */

// runtime.ts에서 실제 구현된 함수들을 가져옵니다
// 이 함수들은 런타임 설정을 지원하여 더 유연한 API URL 생성을 제공합니다
import { getApiBaseUrl as getRuntimeApiBaseUrl, getApiUrl as getRuntimeApiUrl } from './runtime';

/**
 * API 기본 URL을 가져오는 함수
 * 
 * 기본 경로와 /api 접두사를 포함한 완전한 API 기본 URL을 반환합니다.
 * 예: https://example.com/app/api
 * 
 * @returns 완전한 API 기본 URL
 * @deprecated Use getApiBaseUrl from utils/runtime.ts instead
 */
export const getApiBaseUrl = (): string => {
  // 사용자에게 deprecated 경고를 표시합니다
  console.warn('getApiBaseUrl from utils/api.ts is deprecated, use utils/runtime.ts instead');
  
  // 실제로는 runtime.ts의 함수를 호출합니다
  return getRuntimeApiBaseUrl();
};

/**
 * 주어진 엔드포인트로 완전한 API URL을 구성하는 함수
 * 
 * 기본 URL과 엔드포인트를 결합하여 완전한 API URL을 생성합니다.
 * 예: getApiUrl('/auth/login') → https://example.com/app/api/auth/login
 * 
 * @param endpoint - API 엔드포인트 (반드시 /로 시작해야 함, 예: '/auth/login')
 * @returns 완전한 API URL
 * @deprecated Use getApiUrl from utils/runtime.ts instead
 */
export const getApiUrl = (endpoint: string): string => {
  // 사용자에게 deprecated 경고를 표시합니다
  console.warn('getApiUrl from utils/api.ts is deprecated, use utils/runtime.ts instead');
  
  // 실제로는 runtime.ts의 함수를 호출합니다
  return getRuntimeApiUrl(endpoint);
};
