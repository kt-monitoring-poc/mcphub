import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import MainLayout from './layouts/MainLayout';
import DashboardPage from './pages/Dashboard';

import KeyManagementPage from './pages/KeyManagementPage';
import LoginPage from './pages/LoginPage';
import LogsPage from './pages/LogsPage';
import ServersPage from './pages/ServersPage';
import SettingsPage from './pages/SettingsPage';
import UserGroupsPage from './pages/UserGroupsPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import KeyStatusPage from './pages/admin/KeyStatusPage';
import { McpServersPage } from './pages/admin/McpServersPage';
import UsersPage from './pages/admin/UsersPage';
import { getBasePath } from './utils/runtime';

/**
 * App 컴포넌트: 애플리케이션의 메인 컴포넌트
 * 
 * 이 컴포넌트는 다음과 같은 역할을 합니다:
 * 1. 전역 상태 관리자들을 설정 (테마, 인증, 알림)
 * 2. 라우팅 시스템을 구성 (어떤 URL이 어떤 페이지를 보여줄지)
 * 3. 전체 애플리케이션의 구조를 정의
 */
function App() {
  // 기본 경로를 가져옵니다 (예: /app, /mcphub 등)
  const basename = getBasePath();
  
  return (
    // Provider들은 중첩되어 있어서, 안쪽 컴포넌트들이 바깥쪽 Provider의 기능을 사용할 수 있습니다
    <ThemeProvider>
      {/* AuthProvider: 로그인 상태, 사용자 정보 관리 */}
      <AuthProvider>
        {/* ToastProvider: 성공/오류 메시지 표시 기능 */}
        <ToastProvider>
          {/* Router: URL 기반 페이지 이동 관리 */}
          <Router basename={basename}>
            {/* Routes: 여러 Route들을 그룹화 */}
            <Routes>
              {/* 공개 라우트 */}
              <Route path="/login" element={<LoginPage />} />

              {/* 보호된 라우트 */}
              <Route element={<ProtectedRoute />}>
                {/* 일반 사용자 라우트 */}
                <Route element={<MainLayout />}>
                  {/* 홈페이지: 대시보드 */}
                  <Route path="/" element={<DashboardPage />} />

                  <Route path="/user-groups" element={<UserGroupsPage />} />
                  <Route path="/api-keys" element={<KeyManagementPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>

              {/* 관리자 전용 보호된 라우트 */}
              <Route element={<ProtectedRoute requireAdmin={true} />}>
                <Route element={<MainLayout />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/servers" element={<ServersPage />} />
                  <Route path="/admin/mcp-servers" element={<McpServersPage />} />
                  <Route path="/admin/keys" element={<KeyStatusPage />} />
                  <Route path="/admin/users" element={<UsersPage />} />
                  <Route path="/admin/logs" element={<LogsPage />} />
                  <Route path="/admin/settings" element={<AdminSettingsPage />} />
                  {/* 기존 /admin 경로는 /admin/dashboard로 리디렉션 */}
                  <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />
                </Route>
              </Route>

              {/* 매칭되지 않는 라우트는 홈으로 리다이렉트 */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// App 컴포넌트를 다른 파일에서 사용할 수 있도록 내보냅니다
export default App;