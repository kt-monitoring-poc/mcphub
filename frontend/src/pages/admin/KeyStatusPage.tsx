import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Key, User, Calendar, Shield, Copy, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { getToken } from '../../services/authService';

interface UserKeyStatus {
  userId: string;
  username: string;
  githubUsername?: string;
  hasKey: boolean;
  keyInfo?: {
    id: string;
    name: string;
    isActive: boolean;
    expiresAt: string;
    lastUsedAt?: string;
    usageCount: number;
    createdAt: string;
    daysUntilExpiry: number;
  };
  isActive: boolean;
}

const KeyStatusPage: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [userKeys, setUserKeys] = useState<UserKeyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'hasKey' | 'noKey'>('all');

  // 사용자 키 현황 로드
  const loadUserKeyStatus = async () => {
    try {
      const token = getToken();
      const response = await fetch('/api/admin/user-keys', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token || ''
        }
      });

      if (response.ok) {
        const result = await response.json();
        setUserKeys(result.data || []);
      } else {
        throw new Error('사용자 키 현황 로드 실패');
      }
    } catch (error) {
      console.error('사용자 키 현황 로드 오류:', error);
      // 임시로 목 데이터 사용
      setUserKeys([
        {
          userId: '1',
          username: 'admin',
          hasKey: true,
          keyInfo: {
            id: 'key1',
            name: 'Admin Key',
            isActive: true,
            expiresAt: '2024-12-31T23:59:59Z',
            lastUsedAt: '2024-01-15T10:30:00Z',
            usageCount: 150,
            createdAt: '2024-01-01T00:00:00Z',
            daysUntilExpiry: 350
          },
          isActive: true
        },
        {
          userId: '2',
          username: 'jungchihoon',
          githubUsername: 'jungchihoon',
          hasKey: false,
          isActive: true
        },
        {
          userId: '3',
          username: 'ch-jung_ktdev',
          githubUsername: 'ch-jung_ktdev',
          hasKey: true,
          keyInfo: {
            id: 'key3',
            name: 'Dev Key',
            isActive: true,
            expiresAt: '2024-06-30T23:59:59Z',
            lastUsedAt: '2024-01-14T15:20:00Z',
            usageCount: 45,
            createdAt: '2024-01-10T00:00:00Z',
            daysUntilExpiry: 165
          },
          isActive: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserKeyStatus();
  }, []);

  const getExpiryColor = (daysUntilExpiry: number) => {
    if (daysUntilExpiry <= 7) return 'text-red-600';
    if (daysUntilExpiry <= 30) return 'text-orange-600';
    if (daysUntilExpiry <= 90) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getExpiryStatus = (daysUntilExpiry: number) => {
    if (daysUntilExpiry <= 7) return '만료 임박';
    if (daysUntilExpiry <= 30) return '만료 예정';
    if (daysUntilExpiry <= 90) return '주의';
    return '정상';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredUsers = userKeys.filter(user => {
    if (filter === 'hasKey') return user.hasKey;
    if (filter === 'noKey') return !user.hasKey;
    return true;
  });

  const stats = {
    total: userKeys.length,
    hasKey: userKeys.filter(u => u.hasKey).length,
    noKey: userKeys.filter(u => !u.hasKey).length,
    active: userKeys.filter(u => u.isActive).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">키 현황을 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">키 발급 현황</h1>
          <p className="text-gray-600 dark:text-gray-400">사용자별 MCPHub 키 발급 및 사용 현황</p>
        </div>
        <button
          onClick={loadUserKeyStatus}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center">
            <User className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">전체 사용자</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Key className="w-8 h-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">키 발급</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.hasKey}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center">
            <XCircle className="w-8 h-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">미발급</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.noKey}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">활성 사용자</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex space-x-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          전체 ({stats.total})
        </button>
        <button
          onClick={() => setFilter('hasKey')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'hasKey' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          키 발급 ({stats.hasKey})
        </button>
        <button
          onClick={() => setFilter('noKey')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'noKey' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          미발급 ({stats.noKey})
        </button>
      </div>

      {/* 사용자 목록 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  사용자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  키 상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  만료일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  사용 횟수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  마지막 사용
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  계정 상태
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.githubUsername || user.username}
                        </div>
                        {user.githubUsername && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.username}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.hasKey ? (
                      <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                        <span className="text-sm text-green-600">발급됨</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <XCircle className="w-5 h-5 text-red-600 mr-2" />
                        <span className="text-sm text-red-600">미발급</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.hasKey && user.keyInfo ? (
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        <span className={`text-sm ${getExpiryColor(user.keyInfo.daysUntilExpiry)}`}>
                          {formatDate(user.keyInfo.expiresAt)}
                        </span>
                        <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                          getExpiryColor(user.keyInfo.daysUntilExpiry).replace('text-', 'bg-').replace('-600', '-100')
                        }`}>
                          {getExpiryStatus(user.keyInfo.daysUntilExpiry)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.hasKey && user.keyInfo ? (
                      <span className="text-sm text-gray-900 dark:text-white">
                        {user.keyInfo.usageCount.toLocaleString()}회
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.hasKey && user.keyInfo?.lastUsedAt ? (
                      <span className="text-sm text-gray-900 dark:text-white">
                        {formatDate(user.keyInfo.lastUsedAt)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">사용 기록 없음</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.isActive ? (
                      <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                        <span className="text-sm text-green-600">활성</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <XCircle className="w-5 h-5 text-red-600 mr-2" />
                        <span className="text-sm text-red-600">비활성</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default KeyStatusPage; 