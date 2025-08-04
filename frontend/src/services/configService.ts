// API URL과 기본 경로 생성을 위한 유틸리티 함수들을 가져옵니다
import { getApiUrl, getBasePath } from '../utils/runtime';

/**
 * 시스템 설정 인터페이스
 * 
 * 애플리케이션의 다양한 설정들을 정의합니다.
 * 각 설정은 선택적(optional)으로 정의되어 있어서
 * 일부 설정만 있어도 동작할 수 있습니다.
 */
export interface SystemConfig {
  // 라우팅 관련 설정
  routing?: {
    enableGlobalRoute?: boolean;
    enableGroupNameRoute?: boolean;
    enableBearerAuth?: boolean;
    bearerAuthKey?: string;
  };
  
  // 설치 관련 설정
  install?: {
    pythonIndexUrl?: string;          // Python 패키지 인덱스 URL
    npmRegistry?: string;             // NPM 레지스트리 URL
  };
  
  // 스마트 라우팅 관련 설정
  smartRouting?: {
    enabled?: boolean;                // 스마트 라우팅 활성화 여부
    dbUrl?: string;                   // 데이터베이스 URL
    openaiApiBaseUrl?: string;        // OpenAI API 기본 URL
    openaiApiKey?: string;            // OpenAI API 키
    openaiApiEmbeddingModel?: string; // OpenAI 임베딩 모델명
  };
}

/**
 * 공개 설정 응답 인터페이스
 * 
 * 인증 없이 접근 가능한 공개 설정의 응답 구조를 정의합니다.
 */
export interface PublicConfigResponse {
  success: boolean;                   // 요청 성공 여부
  data?: {
    // Reserved for future public configuration
  };
  message?: string;                   // 응답 메시지
}

/**
 * 시스템 설정 응답 인터페이스
 * 
 * 시스템 설정 요청의 응답 구조를 정의합니다.
 */
export interface SystemConfigResponse {
  success: boolean;                   // 요청 성공 여부
  data?: {
    systemConfig?: SystemConfig;      // 시스템 설정 데이터
  };
  message?: string;                   // 응답 메시지
}

/**
 * Get public configuration without authentication
 */
export const getPublicConfig = async (): Promise<PublicConfigResponse> => {
  try {
    // 기본 경로를 가져와서 공개 설정 엔드포인트 구성
    const basePath = getBasePath();
    const response = await fetch(`${basePath}/public-config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 응답이 성공적이면 설정 데이터 반환
    if (response.ok) {
      const data: PublicConfigResponse = await response.json();
      return data;
    }

    return { success: false, message: 'Failed to fetch public config' };
  } catch (error) {
    // 오류 발생 시 기본값 반환
    console.debug('Failed to get public config:', error);
    return { success: false, message: 'Network error' };
  }
};

/**
 * 인증 없이 시스템 설정을 가져오는 함수
 * 
 * 이 함수는 먼저 인증 없이 시스템 설정을 가져오려고 시도합니다.
 * 만약 인증이 필요한 경우(대부분의 경우) null을 반환합니다.
 * 이는 애플리케이션 시작 시 인증 건너뛰기 설정을 확인하는 데 사용됩니다.
 * 
 * @returns Promise<SystemConfig | null> - 시스템 설정 또는 null
 */
export const getSystemConfigPublic = async (): Promise<SystemConfig | null> => {
  try {
    // 인증 없이 시스템 설정 요청
    const response = await fetch(getApiUrl('/settings'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 응답이 성공적이면 설정 데이터 반환
    if (response.ok) {
      const data: SystemConfigResponse = await response.json();
      return data.data?.systemConfig || null;
    }

    // 응답이 실패하면 null 반환
    return null;
  } catch (error) {
    // 오류 발생 시 null 반환
    console.debug('Failed to get system config without auth:', error);
    return null;
  }
};

/**
 * Check if authentication should be skipped based on system configuration
 * @deprecated skipAuth feature has been removed for security reasons
 */
export const shouldSkipAuth = async (): Promise<boolean> => {
  // Always require authentication for security
  return false;
};
