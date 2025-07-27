import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { 
  LayoutDashboard, 
  Server, 
  Users, 
  Settings, 
  Key, 
  FileText,
  LogOut,
  Menu,
  X
} from 'lucide-react';

interface AdminLayoutProps {}

const AdminLayout: React.FC<AdminLayoutProps> = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 관리자 권한 확인
  if (!user?.isAdmin) {
    showToast('관리자 권한이 필요합니다.', 'error');
    navigate('/');
    return null;
  }

  const adminMenuItems = [
    {
      path: '/admin',
      label: '관리자 대시보드',
      icon: <LayoutDashboard className="h-5 w-5" />
    },
    {
      path: '/admin/users',
      label: '사용자 관리',
      icon: <Users className="h-5 w-5" />
    },
    {
      path: '/admin/keys',
      label: '키 발급 현황',
      icon: <Key className="h-5 w-5" />
    },
    {
      path: '/admin/logs',
      label: '시스템 로그',
      icon: <FileText className="h-5 w-5" />
    },
    {
      path: '/admin/settings',
      label: '시스템 설정',
      icon: <Settings className="h-5 w-5" />
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
    showToast('로그아웃되었습니다.', 'success');
  };

  const handleNavigateToUser = () => {
    navigate('/');
    showToast('일반 사용자 모드로 전환되었습니다.', 'info');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              MCPHub 관리자
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              관리자: {user?.githubUsername || user?.username}
            </span>
            <button
              onClick={handleNavigateToUser}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              일반 모드
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* 사이드바 */}
        <aside className={`bg-white dark:bg-gray-800 shadow-sm transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-16'
        }`}>
          <nav className="p-4 space-y-2">
            {adminMenuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {item.icon}
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'ml-0' : 'ml-0'
        }`}>
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout; 