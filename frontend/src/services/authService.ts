// 인증 관련 타입 정의들을 가져옵니다
import {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  ChangePasswordCredentials,
} from '../types';

// API URL 생성을 위한 유틸리티 함수를 가져옵니다
import { getApiUrl } from '../utils/runtime';

/**
 * 인증 서비스
 * 
 * 이 파일은 사용자 인증과 관련된 모든 API 호출을 담당합니다.
 * 로그인, 회원가입, 비밀번호 변경, 토큰 관리 등의 기능을 제공합니다.
 */

// localStorage에 저장할 토큰의 키 이름
const TOKEN_KEY = 'mcphub_token';

/**
 * localStorage에서 인증 토큰을 가져오는 함수
 * 
 * @returns 저장된 토큰 문자열 또는 null (토큰이 없는 경우)
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * localStorage에 인증 토큰을 저장하는 함수
 * 
 * @param token - 저장할 토큰 문자열
 */
export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * localStorage에서 인증 토큰을 제거하는 함수
 * 
 * 로그아웃 시 호출되어 저장된 토큰을 삭제합니다.
 */
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * 사용자 로그인 함수
 * 
 * 서버에 로그인 요청을 보내고, 성공 시 토큰을 localStorage에 저장합니다.
 * 
 * @param credentials - 로그인 정보 (사용자명, 비밀번호)
 * @returns Promise<AuthResponse> - 로그인 결과
 */
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    // API 엔드포인트 URL 로깅 (디버깅용)
    console.log(getApiUrl('/auth/login'));
    
    // 서버에 로그인 요청 전송
    const response = await fetch(getApiUrl('/auth/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    // 응답 데이터 파싱
    const data: AuthResponse = await response.json();

    // 로그인 성공 시 토큰을 localStorage에 저장
    if (data.success && data.token) {
      setToken(data.token);
    }

    return data;
  } catch (error) {
    // 네트워크 오류나 기타 예외 상황 처리
    console.error('Login error:', error);
    return {
      success: false,
      message: 'An error occurred during login',
    };
  }
};

/**
 * 사용자 회원가입 함수
 * 
 * 서버에 회원가입 요청을 보내고, 성공 시 토큰을 localStorage에 저장합니다.
 * 
 * @param credentials - 회원가입 정보 (사용자명, 비밀번호, 관리자 권한)
 * @returns Promise<AuthResponse> - 회원가입 결과
 */
export const register = async (credentials: RegisterCredentials): Promise<AuthResponse> => {
  try {
    // 서버에 회원가입 요청 전송
    const response = await fetch(getApiUrl('/auth/register'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    // 응답 데이터 파싱
    const data: AuthResponse = await response.json();

    // 회원가입 성공 시 토큰을 localStorage에 저장
    if (data.success && data.token) {
      setToken(data.token);
    }

    return data;
  } catch (error) {
    // 네트워크 오류나 기타 예외 상황 처리
    console.error('Register error:', error);
    return {
      success: false,
      message: 'An error occurred during registration',
    };
  }
};

/**
 * 현재 사용자 정보를 가져오는 함수
 * 
 * 저장된 토큰을 사용하여 서버에서 현재 로그인한 사용자의 정보를 가져옵니다.
 * 
 * @returns Promise<AuthResponse> - 사용자 정보 또는 오류
 */
export const getCurrentUser = async (): Promise<AuthResponse> => {
  const token = getToken();

  // 토큰이 없으면 오류 반환
  if (!token) {
    return {
      success: false,
      message: 'No authentication token',
    };
  }

  try {
    // 토큰을 헤더에 포함하여 사용자 정보 요청
    const response = await fetch(getApiUrl('/auth/user'), {
      method: 'GET',
      headers: {
        'x-auth-token': token,
      },
    });

    return await response.json();
  } catch (error) {
    // 네트워크 오류나 기타 예외 상황 처리
    console.error('Get current user error:', error);
    return {
      success: false,
      message: 'An error occurred while fetching user data',
    };
  }
};

/**
 * 비밀번호 변경 함수
 * 
 * 현재 비밀번호와 새 비밀번호를 사용하여 비밀번호를 변경합니다.
 * 
 * @param credentials - 비밀번호 변경 정보 (현재 비밀번호, 새 비밀번호)
 * @returns Promise<AuthResponse> - 비밀번호 변경 결과
 */
export const changePassword = async (
  credentials: ChangePasswordCredentials,
): Promise<AuthResponse> => {
  const token = getToken();

  // 토큰이 없으면 오류 반환
  if (!token) {
    return {
      success: false,
      message: 'No authentication token',
    };
  }

  try {
    // 토큰을 헤더에 포함하여 비밀번호 변경 요청
    const response = await fetch(getApiUrl('/auth/change-password'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token,
      },
      body: JSON.stringify(credentials),
    });

    return await response.json();
  } catch (error) {
    // 네트워크 오류나 기타 예외 상황 처리
    console.error('Change password error:', error);
    return {
      success: false,
      message: 'An error occurred while changing password',
    };
  }
};

/**
 * 사용자 로그아웃 함수
 * 
 * localStorage에서 인증 토큰을 제거하여 로그아웃을 수행합니다.
 * 서버에 별도의 로그아웃 요청을 보내지 않고 클라이언트 측에서만 토큰을 제거합니다.
 */
export const logout = (): void => {
  removeToken();
};
