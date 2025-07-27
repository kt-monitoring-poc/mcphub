import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/Dashboard';
import ServersPage from './pages/ServersPage';
import GroupsPage from './pages/GroupsPage';
import SettingsPage from './pages/SettingsPage';
import MarketPage from './pages/MarketPage';
import LogsPage from './pages/LogsPage';
import KeyStatusPage from './pages/admin/KeyStatusPage';
import KeyManagementPage from './pages/KeyManagementPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import UsersPage from './pages/admin/UsersPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
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

              {/* 일반 사용자 라우팅 */}
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/servers" element={<ServersPage />} />
                  <Route path="/groups" element={<GroupsPage />} />
                  <Route path="/market" element={<MarketPage />} />
                  <Route path="/market/:serverName" element={<MarketPage />} />
                  <Route path="/api-keys" element={<KeyManagementPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>

              {/* 관리자 전용 라우팅 */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/logs" element={<LogsPage />} />
                  <Route path="/admin/settings" element={<AdminSettingsPage />} />
                  <Route path="/admin/keys" element={<KeyStatusPage />} />
                  <Route path="/admin/servers" element={<ServersPage />} />
                  <Route path="/admin/users" element={<UsersPage />} />
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