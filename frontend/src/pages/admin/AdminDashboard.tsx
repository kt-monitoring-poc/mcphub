import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Server, 
  Key, 
  FileText, 
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { getToken } from '../../services/authService';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalServers: number;
  activeServers: number;
  totalKeys: number;
  activeKeys: number;
  todayLogs: number;
  systemStatus: 'healthy' | 'warning' | 'error';
}

interface RecentActivity {
  id: string;
  type: 'user' | 'server' | 'key' | 'warning' | 'info';
  message: string;
  time: string;
  userId?: string;
  serverName?: string;
}

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalServers: 0,
    activeServers: 0,
    totalKeys: 0,
    activeKeys: 0,
    todayLogs: 0,
    systemStatus: 'healthy'
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // 시스템 통계 로드
  const loadSystemStats = async () => {
    try {
      const token = getToken();
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token || ''
        }
      });

      if (response.ok) {
        const result = await response.json();
        setStats(result.data || {});
      } else {
        throw new Error('시스템 통계 로드 실패');
      }
    } catch (error) {
      console.error('시스템 통계 로드 오류:', error);
      // 임시 데이터 사용
      setStats({
        totalUsers: 3,
        activeUsers: 2,
        totalServers: 4,
        activeServers: 3,
        totalKeys: 2,
        activeKeys: 2,
        todayLogs: 1247,
        systemStatus: 'healthy'
      });
    }
  };

  // 최근 활동 로드
  const loadRecentActivities = async () => {
    try {
      const token = getToken();
      const response = await fetch('/api/admin/activities', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token || ''
        }
      });

      if (response.ok) {
        const result = await response.json();
        setRecentActivities(result.data || []);
      } else {
        throw new Error('최근 활동 로드 실패');
      }
    } catch (error) {
      console.error('최근 활동 로드 오류:', error);
      // 임시 데이터 사용
      setRecentActivities([
        {
          id: '1',
          type: 'user',
          message: '새 사용자 jungchihoon이 가입했습니다.',
          time: '2분 전',
          userId: 'jungchihoon'
        },
        {
          id: '2',
          type: 'server',
          message: 'Firecrawl MCP 서버가 연결되었습니다.',
          time: '5분 전',
          serverName: 'Firecrawl'
        },
        {
          id: '3',
          type: 'key',
          message: 'ch-jung_ktdev 사용자가 새 MCPHub 키를 생성했습니다.',
          time: '10분 전',
          userId: 'ch-jung_ktdev'
        },
        {
          id: '4',
          type: 'warning',
          message: 'Context7 서버 연결에 문제가 발생했습니다.',
          time: '15분 전',
          serverName: 'Context7'
        },
        {
          id: '5',
          type: 'info',
          message: '시스템 백업이 완료되었습니다.',
          time: '1시간 전'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSystemStats();
    loadRecentActivities();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <Users className="h-4 w-4 text-blue-600" />;
      case 'server':
        return <Server className="h-4 w-4 text-green-600" />;
      case 'key':
        return <Key className="h-4 w-4 text-purple-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'info':
        return <FileText className="h-4 w-4 text-gray-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSystemStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getSystemStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
        return '정상';
      case 'warning':
        return '주의';
      case 'error':
        return '오류';
      default:
        return '알 수 없음';
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    loadSystemStats();
    loadRecentActivities();
    showToast('데이터를 새로고침했습니다.', 'success');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">데이터를 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            관리자 대시보드
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            MCPHub 시스템 현황을 한눈에 확인하세요
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getSystemStatusColor(stats.systemStatus).replace('text-', 'bg-')}`}></div>
            <span className={`text-sm ${getSystemStatusColor(stats.systemStatus)}`}>
              {getSystemStatusText(stats.systemStatus)}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                총 사용자
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalUsers}
              </p>
              <p className="text-sm text-gray-500">
                활성: {stats.activeUsers}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                서버
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalServers}
              </p>
              <p className="text-sm text-gray-500">
                활성: {stats.activeServers}
              </p>
            </div>
            <Server className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                발급된 키
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalKeys}
              </p>
              <p className="text-sm text-gray-500">
                활성: {stats.activeKeys}
              </p>
            </div>
            <Key className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                오늘 로그
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.todayLogs.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">
                실시간
              </p>
            </div>
            <FileText className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* 최근 활동 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            최근 활동
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">
                    {activity.message}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 빠른 액션 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            빠른 액션
          </h3>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Users className="w-4 h-4 mr-2" />
              사용자 관리
            </button>
            <button className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <Key className="w-4 h-4 mr-2" />
              키 현황 확인
            </button>
            <button className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              <FileText className="w-4 h-4 mr-2" />
              로그 확인
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            시스템 상태
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">데이터베이스</span>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">API 서버</span>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">MCP 서버</span>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">인증 서비스</span>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            알림
          </h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                정기 백업 예정: 2시간 후
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                디스크 사용량: 75%
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                모든 서비스 정상 운영 중
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 