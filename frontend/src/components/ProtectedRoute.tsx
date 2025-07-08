// React 라이브러리를 가져옵니다
import React from 'react';

// React Router의 네비게이션 컴포넌트들을 가져옵니다
import { Navigate, Outlet } from 'react-router-dom';

// 다국어 지원을 위한 react-i18next 훅을 가져옵니다
import { useTranslation } from 'react-i18next';

// 인증 상태를 확인하기 위한 컨텍스트 훅을 가져옵니다
import { useAuth } from '../contexts/AuthContext';

/**
 * 보호된 라우트 속성 인터페이스
 * 
 * 이 컴포넌트가 받을 수 있는 속성들을 정의합니다.
 */
interface ProtectedRouteProps {
  redirectPath?: string;  // 인증되지 않은 사용자를 리다이렉트할 경로 (기본값: '/login')
}

/**
 * 보호된 라우트 컴포넌트
 * 
 * 이 컴포넌트는 인증이 필요한 페이지들을 보호하는 역할을 합니다.
 * 사용자가 로그인하지 않은 상태에서 보호된 페이지에 접근하려고 하면
 * 로그인 페이지로 리다이렉트됩니다.
 * 
 * 주요 기능:
 * - 인증 상태 확인
 * - 로딩 중일 때 로딩 화면 표시
 * - 인증되지 않은 사용자 리다이렉트
 * - 인증된 사용자에게 보호된 콘텐츠 표시
 * 
 * @param redirectPath - 리다이렉트할 경로 (선택사항)
 * @returns 보호된 콘텐츠 또는 리다이렉트 컴포넌트
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  redirectPath = '/login'  // 기본값으로 로그인 페이지 설정
}) => {
  // 다국어 지원 훅 사용
  const { t } = useTranslation();
  
  // 인증 상태 가져오기
  const { auth } = useAuth();

  // 인증 상태가 로딩 중인 경우 로딩 화면 표시
  if (auth.loading) {
    return <div className="flex items-center justify-center h-screen">{t('app.loading')}</div>;
  }

  // 사용자가 인증되지 않은 경우 지정된 경로로 리다이렉트
  if (!auth.isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }

  // 사용자가 인증된 경우 보호된 콘텐츠를 표시
  // Outlet은 중첩된 라우트에서 자식 컴포넌트를 렌더링하는 위치를 나타냅니다
  return <Outlet />;
};

export default ProtectedRoute;