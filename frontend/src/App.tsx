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
import EnvVarManagementPage from './pages/admin/EnvVarManagementPage';
import KeyStatusPage from './pages/admin/KeyStatusPage';
import { McpServersPage } from './pages/admin/McpServersPage';
import UsersPage from './pages/admin/UsersPage';
import { getBasePath } from './utils/runtime';

function App() {
  const basename = getBasePath();
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Router basename={basename}>
            <Routes>
              {/* 공개 라우트 */}
              <Route path="/login" element={<LoginPage />} />

              {/* 보호된 라우트 */}
              <Route element={<ProtectedRoute />}>
                {/* 일반 사용자 라우트 */}
                <Route element={<MainLayout />}>
                  <Route path="/" element={<DashboardPage />} />

                  <Route path="/user-groups" element={<UserGroupsPage />} />
                  <Route path="/keys" element={<KeyManagementPage />} />
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
                  <Route path="/admin/env-vars" element={<EnvVarManagementPage />} />
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

export default App;