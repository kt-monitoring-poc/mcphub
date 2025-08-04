import Content from '@/components/layout/Content';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import React from 'react';
import { Outlet } from 'react-router-dom';

const MainLayout: React.FC = () => {
  // 사이드바 펼침/접힘 상태 제어
  // useState는 React의 상태 관리 훅입니다
  // sidebarCollapsed: 현재 사이드바가 접혀있는지 여부 (true=접힘, false=펼침)
  // setSidebarCollapsed: 사이드바 상태를 변경하는 함수
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  /**
   * 사이드바 토글 함수
   * 현재 상태의 반대값으로 사이드바 상태를 변경합니다
   */
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航 */}
      <Header onToggleSidebar={toggleSidebar} />

      <div className="flex flex-1 overflow-hidden">
        {/* 사이드 네비게이션 */}
        {/* collapsed: 사이드바의 펼침/접힘 상태를 전달 */}
        <Sidebar collapsed={sidebarCollapsed} />

        {/* 主内容区域 */}
        <Content>
          <Outlet />
        </Content>
      </div>
    </div>
  );
};

// MainLayout 컴포넌트를 다른 파일에서 사용할 수 있도록 내보냅니다
export default MainLayout;