// 런타임 설정 타입을 가져옵니다
// 이 타입은 애플리케이션 실행 중에 동적으로 로드되는 설정의 구조를 정의합니다
import type { RuntimeConfig } from '../types/runtime';

/**
 * 윈도우 객체에서 런타임 설정을 가져오는 함수
 * 
 * 애플리케이션이 시작될 때 서버에서 로드된 설정을 윈도우 객체에 저장하고,
 * 이 함수를 통해 어디서든 접근할 수 있습니다.
 * 
 * @returns 런타임 설정 객체 (기본값이 포함됨)
 */
export const getRuntimeConfig = (): RuntimeConfig => {
  return (
    // 윈도우 객체에 저장된 설정이 있으면 사용하고, 없으면 기본값 사용
    window.__MCPHUB_CONFIG__ || {
      basePath: '',      // 기본 경로 (예: /app, /mcphub)
      version: 'dev',    // 애플리케이션 버전
      name: 'mcphub',    // 애플리케이션 이름
    }
  );
};

/**
 * 런타임 설정에서 기본 경로를 가져오는 함수
 * 
 * 애플리케이션이 서브 경로에 배포될 때 사용되는 기본 경로를 반환합니다.
 * 예: https://example.com/app → '/app'
 * 
 * @returns 정규화된 기본 경로 (항상 /로 시작하거나 빈 문자열)
 */
export const getBasePath = (): string => {
  const config = getRuntimeConfig();
  const basePath = config.basePath || '';

  // 경로가 비어있지 않고 /로 시작하지 않으면 /를 앞에 추가
  // 예: 'app' → '/app'
  if (basePath && !basePath.startsWith('/')) {
    return '/' + basePath;
  }
  return basePath;
};

/**
 * API 기본 URL을 가져오는 함수
 * 
 * 기본 경로와 /api 접두사를 결합하여 API 요청의 기본 URL을 생성합니다.
 * 예: /app → '/app/api'
 * 
 * @returns API 기본 URL
 */
export const getApiBaseUrl = (): string => {
  const basePath = getBasePath();
  // 항상 기본 경로에 /api를 추가하여 API 엔드포인트를 구성
  return basePath + '/api';
};

/**
 * 주어진 엔드포인트로 완전한 API URL을 구성하는 함수
 * 
 * API 기본 URL과 엔드포인트를 결합하여 완전한 API URL을 생성합니다.
 * 예: getApiUrl('auth/login') → '/app/api/auth/login'
 * 
 * @param endpoint - API 엔드포인트 (예: 'auth/login', '/auth/login')
 * @returns 완전한 API URL
 */
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();
  // 엔드포인트가 /로 시작하지 않으면 /를 앞에 추가
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  return baseUrl + normalizedEndpoint;
};

/**
 * 서버에서 런타임 설정을 로드하는 함수
 * 
 * 애플리케이션 시작 시 서버의 /config 엔드포인트에서 설정을 가져옵니다.
 * 여러 가능한 경로를 시도하여 설정을 찾습니다.
 * 
 * @returns Promise<RuntimeConfig> - 로드된 런타임 설정
 */
export const loadRuntimeConfig = async (): Promise<RuntimeConfig> => {
  try {
    // 초기 설정 로드를 위해 올바른 경로를 결정해야 합니다
    // 현재 위치를 기반으로 가능한 경로들을 시도합니다
    const currentPath = window.location.pathname;
    
    // 시도할 수 있는 설정 경로들
    const possibleConfigPaths = [
      // 이미 서브 경로에 있다면 해당 경로를 사용
      currentPath.replace(/\/[^/]*$/, '') + '/config',
      // 루트 설정 시도
      '/config',
      // 잠재적 기본 경로들로 시도
      ...(currentPath.includes('/')
        ? [currentPath.split('/')[1] ? `/${currentPath.split('/')[1]}/config` : '/config']
        : ['/config']),
    ];

    // 각 경로를 순차적으로 시도
    for (const configPath of possibleConfigPaths) {
      try {
        const response = await fetch(configPath, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Cache-Control': 'no-cache',  // 캐시하지 않음
          },
        });

        // 성공적으로 응답을 받았고 데이터가 있으면 반환
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            return data.data;
          }
        }
      } catch (error) {
        // 이 경로에서 실패하면 다음 경로로 계속 시도
        console.debug(`Failed to load config from ${configPath}:`, error);
      }
    }

    // 모든 경로에서 실패한 경우 기본 설정으로 폴백
    console.warn('Could not load runtime config from server, using defaults');
    return {
      basePath: '',
      version: 'dev',
      name: 'mcphub',
    };
  } catch (error) {
    // 예상치 못한 오류가 발생한 경우에도 기본 설정으로 폴백
    console.error('Error loading runtime config:', error);
    return {
      basePath: '',
      version: 'dev',
      name: 'mcphub',
    };
  }
};
