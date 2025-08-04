import ThemeSwitch from '@/components/ui/ThemeSwitch';
import { useAuth } from '@/contexts/AuthContext';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { GitHubIcon } from '../components/icons/GitHubIcon';
import * as authService from '../services/authService';

/**
 * 로그인 페이지 컴포넌트
 * 
 * 이 컴포넌트는 사용자 로그인을 위한 페이지를 제공합니다.
 * 사용자명과 비밀번호를 입력받아 인증을 처리하고,
 * 성공 시 메인 페이지로 리다이렉트합니다.
 * 
 * 주요 기능:
 * - 로그인 폼 표시
 * - 입력 유효성 검사
 * - 로그인 처리 및 오류 표시
 * - 다크/라이트 테마 전환
 */
const LoginPage: React.FC = () => {
  // 다국어 지원 훅 사용
  const { t } = useTranslation();
  
  // 폼 입력 상태 관리
  const [username, setUsername] = useState('');  // 사용자명 입력값
  const [password, setPassword] = useState('');  // 비밀번호 입력값
  
  // UI 상태 관리
  const [error, setError] = useState<string | null>(null);  // 오류 메시지
  const [loading, setLoading] = useState(false);            // 로딩 상태
  
  // 인증 관련 훅과 페이지 이동 함수
  const { login } = useAuth();
  const navigate = useNavigate();

  /**
   * 폼 제출 처리 함수
   * 
   * 사용자가 로그인 폼을 제출할 때 호출됩니다.
   * 입력 유효성 검사 후 로그인을 시도하고,
   * 성공/실패에 따라 적절한 처리를 수행합니다.
   * 
   * @param e - 폼 제출 이벤트
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();  // 기본 폼 제출 동작 방지
    setError(null);      // 이전 오류 메시지 초기화
    setLoading(true);    // 로딩 상태 시작

    try {
      // 입력 필드 유효성 검사
      if (!username || !password) {
        setError('사용자명과 비밀번호를 입력해주세요.');
        setLoading(false);
        return;
      }

      // 로그인 시도
      const success = await login(username, password);

      if (success) {
        // 로그인 성공 후 사용자 정보를 가져와서 관리자 여부 확인
        const userInfo = await authService.getCurrentUser();
        if (userInfo.success && userInfo.user?.isAdmin) {
          navigate('/admin/dashboard');
        } else {
          navigate('/');
        }
      } else {
        setError('로그인에 실패했습니다. 사용자명과 비밀번호를 확인해주세요.');
      }
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);  // 로딩 상태 종료
    }
  };

  const handleGitHubLogin = () => {
    // GitHub OAuth 로그인 시작
    window.location.href = '/api/auth/github';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 login-container">
      {/* 테마 전환 스위치 - 우상단에 배치 */}
      <div className="absolute top-4 right-4">
        <ThemeSwitch />
      </div>
      
      {/* 로그인 카드 컨테이너 */}
      <div className="max-w-md w-full space-y-8 login-card p-8">
        {/* 페이지 제목 */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            관리자 로그인
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            시스템 관리자만 접근 가능합니다
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* 입력 필드들 */}
          <div className="rounded-md -space-y-px">
            {/* 사용자명 입력 필드 */}
            <div>
              <label htmlFor="username" className="sr-only">
                사용자명
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-200 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-800 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm transition-all duration-200 form-input"
                placeholder="사용자명"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            
            {/* 비밀번호 입력 필드 */}
            <div>
              <label htmlFor="password" className="sr-only">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-800 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm login-input transition-all duration-200 form-input"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* 오류 메시지 표시 */}
          {error && (
            <div className="text-red-500 dark:text-red-400 text-sm text-center error-box p-2 rounded">{error}</div>
          )}

          {/* 로그인 버튼 */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 login-button transition-all duration-200 btn-primary"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </div>

          {/* 구분선 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                일반 사용자
              </span>
            </div>
          </div>

          {/* GitHub OAuth 로그인 버튼 */}
          <div>
            <button
              type="button"
              onClick={handleGitHubLogin}
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
            >
              <GitHubIcon className="w-5 h-5 mr-2" />
              GitHub OAuth로 로그인하기
            </button>

            <p className="mt-3 text-sm text-center text-gray-500 dark:text-gray-400">
              일반 사용자는 GitHub OAuth로만 로그인 가능합니다
            </p>
          </div>
        </form>

        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            로그인하면 MCPHub의 이용약관 및 개인정보처리방침에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;