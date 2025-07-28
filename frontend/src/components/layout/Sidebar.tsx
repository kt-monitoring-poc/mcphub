/**
 * 사이드바 컴포넌트
 * 
 * 애플리케이션의 주요 네비게이션을 담당하는 사이드바 컴포넌트입니다.
 * 접을 수 있는 네비게이션 메뉴와 사용자 프로필 메뉴를 제공합니다.
 * 
 * 주요 기능:
 * - 접을 수 있는 네비게이션 메뉴
 * - 대시보드, 서버, 그룹, 마켓, 로그 페이지 링크
 * - 활성 페이지 하이라이트
 * - 사용자 프로필 메뉴
 * - 버전 정보 표시
 */

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Shield } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useNavigate } from 'react-router-dom';

/**
 * Sidebar 컴포넌트의 Props 인터페이스
 */
interface SidebarProps {
  /** 사이드바 접힘 상태 */
  collapsed: boolean;
}

/**
 * 메뉴 아이템 인터페이스
 */
interface MenuItem {
  /** 라우트 경로 */
  path: string;
  /** 메뉴 라벨 */
  label: string;
  /** 메뉴 아이콘 */
  icon: React.ReactNode;
  /** 관리자 전용 여부 */
  adminOnly?: boolean;
}

/**
 * 사이드바 컴포넌트
 * 
 * 애플리케이션의 주요 네비게이션을 제공하는 사이드바를 렌더링합니다.
 * 접을 수 있는 구조로 되어 있으며, 각 페이지로의 링크를 제공합니다.
 * 
 * @param {SidebarProps} props - 컴포넌트 props
 * @param {boolean} props.collapsed - 사이드바 접힘 상태
 * @returns {JSX.Element} 사이드바 컴포넌트
 */
const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // 메뉴 아이템 구성 (사용자 권한에 따라 필터링)
  const allMenuItems: MenuItem[] = [
    {
      path: '/',
      label: t('nav.dashboard'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
          <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
        </svg>
      ),
    },
    {
      path: '/servers',
      label: t('nav.servers'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm14 1a1 1 0 11-2 0 1 1 0 012 0zM2 13a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2zm14 1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
        </svg>
      ),
      adminOnly: true, // 관리자만 서버 등록/삭제 가능
    },
    {
      path: '/groups',
      label: t('nav.groups'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
        </svg>
      ),
    },
    {
      path: '/market',
      label: t('nav.market'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
        </svg>
      ),
      adminOnly: true, // 관리자만 마켓플레이스에서 서버 설치 가능
    },
    {
      path: '/api-keys',
      label: t('nav.apiKeys'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
        </svg>
      ),
      adminOnly: false, // 모든 사용자 접근 가능 (일반 사용자도 키 관리 필요)
    },

    {
      path: '/logs',
      label: t('nav.logs'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      ),
      adminOnly: true, // 관리자만 접근 가능
    },
    {
      path: '/settings',
      label: t('nav.settings'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      ),
      adminOnly: false, // 모든 사용자 접근 가능
    },
  ];

  // 사용자 권한에 따라 메뉴 필터링
  console.log('🔍 Sidebar - 사용자 정보:', user);
  console.log('🔍 Sidebar - isAdmin:', user?.isAdmin);
  console.log('🔍 Sidebar - user 타입:', typeof user);
  console.log('🔍 Sidebar - user 키들:', user ? Object.keys(user) : 'user is null');

  const menuItems = allMenuItems.filter(item => {
    // adminOnly가 true인 항목은 관리자만 볼 수 있음
    if (item.adminOnly && !user?.isAdmin) {
      console.log(`🔍 Sidebar - 필터링됨: ${item.label} (adminOnly: ${item.adminOnly}, user.isAdmin: ${user?.isAdmin})`);
      return false;
    }

    // admin 계정이 일반 사용자 모드에서는 최소한의 메뉴만 보이도록
    if (user?.isAdmin && !item.adminOnly) {
      // admin 계정은 일반 사용자 모드에서 대시보드, 그룹, MCPHub Keys, 설정만 보이도록
      const allowedPaths = ['/', '/groups', '/api-keys', '/settings'];
      if (!allowedPaths.includes(item.path)) {
        console.log(`🔍 Sidebar - admin 계정 일반 모드에서 필터링됨: ${item.label} (${item.path})`);
        return false;
      }
    }

    return true;
  });

  console.log('🔍 Sidebar - 필터링된 메뉴:', menuItems.map(item => item.label));

  // 관리자 모드 버튼 표시 조건 디버그
  console.log('🔍 Sidebar - 관리자 모드 버튼 조건:', {
    userExists: !!user,
    isAdmin: user?.isAdmin,
    shouldShowAdminButton: user?.isAdmin
  });

  return (
    <aside
      className={`bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out flex flex-col h-full relative ${collapsed ? 'w-16' : 'w-64'
        }`}
    >
      {/* 스크롤 가능한 네비게이션 영역 */}
      <div className="overflow-y-auto flex-grow">
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-2.5 py-2 rounded-lg transition-colors duration-200
         ${isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-100'}`
              }
              end={item.path === '/'}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="ml-3">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* 관리자 모드 버튼 (관리자인 경우에만 표시) */}
      {user?.isAdmin && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              navigate('/admin');
              showToast('관리자 모드로 전환되었습니다.', 'info');
            }}
            className="w-full flex items-center px-2.5 py-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-colors duration-200"
          >
            <Shield className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="ml-3">관리자 모드</span>}
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;