import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import * as authService from '../services/authService';
import { AuthState } from '../types';

/**
 * 초기 인증 상태
 * 
 * 애플리케이션이 시작될 때의 기본 인증 상태를 정의합니다.
 * 사용자가 로그인하지 않은 상태를 나타냅니다.
 */
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: true,
};

// Auth context
const AuthContext = createContext<{
  auth: AuthState;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}>({
  auth: initialState,
  login: async () => false,
  logout: () => { },
  refreshUser: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 인증 상태를 관리하는 state
  const [auth, setAuth] = useState<AuthState>(initialState);

  /**
   * 사용자 로딩 효과
   * 
   * 컴포넌트가 마운트될 때 실행되며, 다음을 수행합니다:
   * 1. 인증 건너뛰기 설정 확인
   * 2. 저장된 토큰 확인
   * 3. 토큰이 있으면 사용자 정보 로드
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for OAuth token in URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');

        if (urlToken) {
          authService.setToken(urlToken);
          console.log('OAuth 토큰 저장 완료');

          // Clean up URL by removing token parameter
          urlParams.delete('token');
          const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
          window.history.replaceState({}, '', newUrl);
        } else if (!authService.getToken()) {
          // 토큰이 없을 때만 간단히 로그
          setAuth({
            isAuthenticated: false,
            user: null,
            loading: false,
          });
          return;
        }

        // JWT 토큰 기반 인증만 사용

        if (!authService.getToken()) {
          setAuth({
            ...initialState,
            loading: false,
          });
          return;
        }

        try {
          const response = await authService.getCurrentUser();

          if (response.success && (response.user || response.data)) {
            // OAuth는 response.data에, 일반 로그인은 response.user에 사용자 정보가 있음
            const userData = response.user || response.data;
            setAuth({
              isAuthenticated: true,
              user: userData,
              loading: false,
            });
          } else {
            authService.removeToken();
            setAuth({
              ...initialState,
              loading: false,
            });
          }
        } catch (error) {
          console.error('사용자 인증 실패:', error);
          authService.removeToken();
          setAuth({
            ...initialState,
            loading: false,
          });
        }
      } catch (error) {
        console.error('인증 초기화 실패:', error);
        setAuth({
          ...initialState,
          loading: false,
        });
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await authService.login({ username, password });
      if (response.success && response.user) {
        setAuth({
          isAuthenticated: true,
          user: response.user,
          loading: false,
        });
        return true;
      }
    } catch (error) {
      console.error('로그인 실패:', error);
    }
    return false;
  };

  const logout = () => {
    authService.removeToken();
    setAuth({
      ...initialState,
      loading: false,
    });
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const response = await authService.getCurrentUser();

      if (response.success && (response.user || response.data)) {
        const userData = response.user || response.data;
        setAuth({
          isAuthenticated: true,
          user: userData,
          loading: false,
        });
      } else {
        logout();
      }
    } catch (error) {
      console.error('사용자 정보 새로고침 실패:', error);
      logout();
    }
  };

  // 컨텍스트 제공자로 하위 컴포넌트들에게 인증 관련 값들을 제공
  return (
    <AuthContext.Provider value={{ auth, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};