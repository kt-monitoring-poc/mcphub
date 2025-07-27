import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthState } from '../types';
import * as authService from '../services/authService';

// Initial auth state
const initialState: AuthState = {
  isAuthenticated: false,
  loading: true,
  user: null,
  error: null,
};

// Create auth context
const AuthContext = createContext<{
  auth: AuthState;
  user: AuthState['user'];
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string, isAdmin?: boolean) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}>({
  auth: initialState,
  user: null,
  isAuthenticated: false,
  loading: true,
  login: async () => false,
  register: async () => false,
  logout: () => { },
  refreshUser: async () => { },
});

// Auth provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>(initialState);

  // Load user if token exists
  useEffect(() => {
    const loadUser = async () => {
            // Check for token in URL parameters (GitHub OAuth callback)
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      let token = authService.getToken();

      if (urlToken) {
        // Store the token from URL parameter
        authService.setToken(urlToken);
        token = urlToken; // Use the URL token immediately
        // Clean up URL by removing token parameter
        urlParams.delete('token');
        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
        window.history.replaceState({}, '', newUrl);
        console.log(`🔍 AuthContext: URL에서 OAuth 토큰 발견 및 저장됨: ${urlToken.substring(0, 50)}...`);
      }

      // JWT 토큰 기반 인증만 사용

      if (!token) {
        console.log('🔍 AuthContext: JWT 토큰 없음, 비인증 상태로 설정');
        setAuth({
          ...initialState,
          loading: false,
        });
        return;
      }

      try {
        console.log('🔍 AuthContext: getCurrentUser 호출 시작');
        const response = await authService.getCurrentUser();
        console.log('🔍 AuthContext: getCurrentUser 응답:', response);

        if (response.success && (response.user || response.data)) {
          console.log('🔍 AuthContext: 인증 성공, 사용자 정보 설정');
          // OAuth는 response.data에, 일반 로그인은 response.user에 사용자 정보가 있음
          const userData = response.user || response.data;
          console.log('🔍 AuthContext: 사용자 데이터:', userData);
          console.log('🔍 AuthContext: isAdmin:', userData.isAdmin);
          setAuth({
            isAuthenticated: true,
            loading: false,
            user: userData,
            error: null,
          });
        } else {
          console.log('🔍 AuthContext: 인증 실패, 토큰 제거');
          authService.removeToken();
          setAuth({
            ...initialState,
            loading: false,
          });
        }
      } catch (error) {
        authService.removeToken();
        setAuth({
          ...initialState,
          loading: false,
        });
      }
    };

    loadUser();
  }, []);

  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await authService.login({ username, password });

      if (response.success && response.token && response.user) {
        setAuth({
          isAuthenticated: true,
          loading: false,
          user: response.user,
          error: null,
        });
        return true;
      } else {
        setAuth({
          ...initialState,
          loading: false,
          error: response.message || 'Authentication failed',
        });
        return false;
      }
    } catch (error) {
      setAuth({
        ...initialState,
        loading: false,
        error: 'Authentication failed',
      });
      return false;
    }
  };

  // Register function
  const register = async (
    username: string,
    password: string,
    isAdmin = false
  ): Promise<boolean> => {
    try {
      const response = await authService.register({ username, password, isAdmin });

      if (response.success && response.token && response.user) {
        setAuth({
          isAuthenticated: true,
          loading: false,
          user: response.user,
          error: null,
        });
        return true;
      } else {
        setAuth({
          ...initialState,
          loading: false,
          error: response.message || 'Registration failed',
        });
        return false;
      }
    } catch (error) {
      setAuth({
        ...initialState,
        loading: false,
        error: 'Registration failed',
      });
      return false;
    }
  };

  // Refresh user data function
  const refreshUser = async (): Promise<void> => {
    try {
      console.log('🔄 AuthContext: 사용자 정보 새로고침 시작');
      const response = await authService.getCurrentUser();
      console.log('🔄 AuthContext: 새로고침 응답:', response);

      if (response.success && (response.user || response.data)) {
        const userData = response.user || response.data;
        console.log('🔄 AuthContext: 새 사용자 데이터:', userData);
        console.log('🔄 AuthContext: 새 isAdmin:', userData.isAdmin);
        setAuth({
          isAuthenticated: true,
          loading: false,
          user: userData,
          error: null,
        });
      }
    } catch (error) {
      console.error('🔄 AuthContext: 사용자 정보 새로고침 실패:', error);
    }
  };

  // Logout function
  const logout = (): void => {
    authService.logout();
    setAuth({
      ...initialState,
      loading: false,
    });
  };

  return (
    <AuthContext.Provider value={{ 
      auth, 
      user: auth.user, 
      isAuthenticated: auth.isAuthenticated, 
      loading: auth.loading,
      login, 
      register, 
      logout, 
      refreshUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);