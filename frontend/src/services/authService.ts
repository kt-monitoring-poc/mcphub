import {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
} from '../types';
import { getApiUrl } from '../utils/runtime';

// Token key in localStorage
const TOKEN_KEY = 'mcphub_token';

// Get token from localStorage
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

// Set token in localStorage
export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

// Remove token from localStorage
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

// Login user
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    console.log(getApiUrl('/auth/login'));
    const response = await fetch(getApiUrl('/auth/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data: AuthResponse = await response.json();

    if (data.success && data.token) {
      setToken(data.token);
    }

    return data;
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'An error occurred during login',
    };
  }
};

// Register user
export const register = async (credentials: RegisterCredentials): Promise<AuthResponse> => {
  try {
    const response = await fetch(getApiUrl('/auth/register'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data: AuthResponse = await response.json();

    if (data.success && data.token) {
      setToken(data.token);
    }

    return data;
  } catch (error) {
    console.error('Register error:', error);
    return {
      success: false,
      message: 'An error occurred during registration',
    };
  }
};

// Get current user
export const getCurrentUser = async (): Promise<AuthResponse> => {
  const token = getToken();

  if (!token) {
    return {
      success: false,
      message: 'No authentication token',
    };
  }

  try {
    const response = await fetch(getApiUrl('/auth/me'), {
      method: 'GET',
      headers: {
        'x-auth-token': token,
      },
    });

    return await response.json();
  } catch (error) {
    console.error('Get current user error:', error);
    return {
      success: false,
      message: 'An error occurred while fetching user data',
    };
  }
};



// Logout user
export const logout = (): void => {
  removeToken();
};

// 사용자 관리 API (관리자용)
export const getAllUsers = async () => {
  const response = await fetch('/api/admin/users/list', {
    headers: {
      'x-auth-token': getToken() || '',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('사용자 목록 조회에 실패했습니다.');
  }

  return response.json();
};

export const toggleUserActive = async (userId: string, isActive: boolean) => {
  const response = await fetch(`/api/admin/users/${userId}/active`, {
    method: 'PUT',
    headers: {
      'x-auth-token': getToken() || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isActive }),
  });

  if (!response.ok) {
    throw new Error('사용자 활성화 상태 변경에 실패했습니다.');
  }

  return response.json();
};

export const toggleUserAdmin = async (userId: string, isAdmin: boolean) => {
  const response = await fetch(`/api/admin/users/${userId}/admin`, {
    method: 'PUT',
    headers: {
      'x-auth-token': getToken() || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isAdmin }),
  });

  if (!response.ok) {
    throw new Error('사용자 권한 변경에 실패했습니다.');
  }

  return response.json();
};

export const deleteUser = async (userId: string) => {
  const response = await fetch(`/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'x-auth-token': getToken() || '',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('사용자 삭제에 실패했습니다.');
  }

  return response.json();
};
