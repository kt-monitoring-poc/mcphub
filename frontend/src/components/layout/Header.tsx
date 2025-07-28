/**
 * 헤더 컴포넌트
 * 
 * 애플리케이션의 최상단 헤더 영역을 담당하는 컴포넌트입니다.
 * 사이드바 토글, 앱 제목, 테마 스위치, 사용자 정보 등을 포함합니다.
 * 
 * 주요 기능:
 * - 사이드바 토글 버튼
 * - 애플리케이션 제목 표시
 * - 사용자 정보 표시
 * - 테마 스위치
 */

import ThemeSwitch from '@/components/ui/ThemeSwitch';
import UserProfileMenu from '@/components/ui/UserProfileMenu';
import { useAuth } from '@/contexts/AuthContext';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

/**
 * Header 컴포넌트의 Props 인터페이스
 */
interface HeaderProps {
  /** 사이드바 토글 핸들러 */
  onToggleSidebar: () => void;
}

/**
 * 헤더 컴포넌트
 * 
 * 애플리케이션의 최상단 헤더를 렌더링하며, 네비게이션 컨트롤과
 * 사용자 정보, 테마 스위치를 제공합니다.
 * 
 * @param {HeaderProps} props - 컴포넌트 props
 * @param {() => void} props.onToggleSidebar - 사이드바 토글 핸들러
 * @returns {JSX.Element} 헤더 컴포넌트
 */
const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm z-10 border-b border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center px-3 py-3">
        <div className="flex items-center">
          {/* 사이드바 토글 버튼 */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
            aria-label={t('app.toggleSidebar')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* 애플리케이션 제목 - 클릭 가능한 링크 */}
          <button
            onClick={() => navigate('/')}
            className="ml-4 text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 transition-all duration-200 ease-in-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded px-2 py-1"
          >
            {t('app.title')}
          </button>
        </div>

        {/* 우측 상단: 사용자 프로필 메뉴 및 테마 스위치 */}
        <div className="flex items-center space-x-4">
          {/* 사용자 프로필 메뉴 */}
          {user && (
            <UserProfileMenu
              collapsed={false}
              version={import.meta.env.PACKAGE_VERSION || 'dev'}
            />
          )}

          {/* 테마 스위치 */}
          <ThemeSwitch />
        </div>
      </div>
    </header>
  );
};

export default Header;