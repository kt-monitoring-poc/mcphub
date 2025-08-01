import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { useToast } from '../contexts/ToastContext';
import { getToken } from '../services/authService';
import { getApiUrl } from '../utils/runtime';

interface UserGroup {
  id: string;
  name: string;
  description?: string;
  servers: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Server {
  name: string;
  status: string;
  tools: any[];
  enabled: boolean;
}

const UserGroupsPage: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    servers: [] as string[]
  });

  useEffect(() => {
    loadGroups();
    loadServers();
  }, []);

  const loadGroups = async () => {
    try {
      const response = await fetch(getApiUrl('/user/groups'), {
        headers: {
          'x-auth-token': getToken() || '',
        },
      });
      const data = await response.json();
      setGroups(data.data);
    } catch (error) {
      console.error('그룹 목록 로드 실패:', error);
      showToast('그룹 목록을 불러오는데 실패했습니다.', 'error');
    }
  };

  const loadServers = async () => {
    try {
      const response = await fetch(getApiUrl('/servers'), {
        headers: {
          'x-auth-token': getToken() || '',
        },
      });
      const data = await response.json();
      setServers(data.data.filter((server: Server) => server.enabled));
    } catch (error) {
      console.error('서버 목록 로드 실패:', error);
      showToast('서버 목록을 불러오는데 실패했습니다.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        const response = await fetch(getApiUrl(`/user/groups/${isEditing}`), {
          headers: {
            'x-auth-token': getToken() || '',
            'Content-Type': 'application/json',
          },
          method: 'PUT',

          body: JSON.stringify(formData),
        });
        if (!response.ok) throw new Error('그룹 수정 실패');
        showToast('그룹이 수정되었습니다.', 'success');
      } else {
        const response = await fetch(getApiUrl('/user/groups'), {
          headers: {
            'x-auth-token': getToken() || '',
            'Content-Type': 'application/json',
          },
          method: 'POST',

          body: JSON.stringify(formData),
        });
        if (!response.ok) throw new Error('그룹 생성 실패');
        showToast('새 그룹이 생성되었습니다.', 'success');
      }
      setIsCreating(false);
      setIsEditing(null);
      setFormData({ name: '', description: '', servers: [] });
      loadGroups();
    } catch (error) {
      console.error('그룹 저장 실패:', error);
      showToast('그룹 저장에 실패했습니다.', 'error');
    }
  };

  const handleEdit = (group: UserGroup) => {
    setIsEditing(group.id);
    setFormData({
      name: group.name,
      description: group.description || '',
      servers: group.servers
    });
    setIsCreating(true);
  };

  const handleDelete = async (groupId: string) => {
    if (!window.confirm('정말 이 그룹을 삭제하시겠습니까?')) return;
    try {
      const response = await fetch(getApiUrl(`/user/groups/${groupId}`), {
        headers: {
          'x-auth-token': getToken() || '',
        },
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('그룹 삭제 실패');
      showToast('그룹이 삭제되었습니다.', 'success');
      loadGroups();
    } catch (error) {
      console.error('그룹 삭제 실패:', error);
      showToast('그룹 삭제에 실패했습니다.', 'error');
    }
  };

  const handleToggleActive = async (groupId: string, isActive: boolean) => {
    try {
      const response = await fetch(getApiUrl(`/user/groups/${groupId}/active`), {
        headers: {
          'x-auth-token': getToken() || '',
          'Content-Type': 'application/json',
        },
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error('그룹 상태 변경 실패');
      showToast(`그룹이 ${isActive ? '활성화' : '비활성화'} 되었습니다.`, 'success');
      loadGroups();
    } catch (error) {
      console.error('그룹 상태 변경 실패:', error);
      showToast('그룹 상태 변경에 실패했습니다.', 'error');
    }
  };

  return (
    <div className="container mx-auto p-4">
      {/* 기능 설명 섹션 */}
      <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3">
          🎯 MCP 서버 그룹 관리란?
        </h2>
        <div className="space-y-3 text-blue-700 dark:text-blue-300">
          <p>
            <strong>목적:</strong> Cursor IDE에서 사용할 MCP 서버들을 그룹으로 관리하여,
            필요한 서버의 도구들만 선택적으로 사용할 수 있게 합니다.
          </p>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
              <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">✅ 그룹이 있는 경우</h3>
              <ul className="text-sm space-y-1">
                <li>• 활성화된 그룹의 서버들만 Cursor IDE에 표시</li>
                <li>• 해당 서버의 도구들만 사용 가능</li>
                <li>• 다른 서버의 도구는 숨겨짐</li>
              </ul>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
              <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">🌐 그룹이 없는 경우</h3>
              <ul className="text-sm space-y-1">
                <li>• 모든 MCP 서버가 Cursor IDE에 표시</li>
                <li>• 모든 서버의 도구들을 자유롭게 사용</li>
                <li>• 기본 동작 방식</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              💡 <strong>사용 예시:</strong> 개발 작업 시에는 GitHub 관련 서버만,
              문서 작업 시에는 문서 관련 서버만 그룹으로 만들어 사용하세요!
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">내 MCP 서버 그룹</h1>
        <Button
          onClick={() => {
            setIsCreating(!isCreating);
            setIsEditing(null);
            setFormData({ name: '', description: '', servers: [] });
          }}
        >
          {isCreating ? '취소' : '새 그룹 만들기'}
        </Button>
      </div>

      {isCreating && (
        <form onSubmit={handleSubmit} className="mb-8 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="mb-4">
            <label className="block mb-2">그룹 이름</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2">설명 (선택사항)</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2">MCP 서버 선택</label>
            <div className="grid grid-cols-2 gap-4">
              {(servers || []).map((server) => (
                <label key={server.name} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.servers.includes(server.name)}
                    onChange={(e) => {
                      const newServers = e.target.checked
                        ? [...formData.servers, server.name]
                        : formData.servers.filter(s => s !== server.name);
                      setFormData({ ...formData, servers: newServers });
                    }}
                    className="form-checkbox"
                  />
                  <span>{server.name} ({server.tools.length}개 툴)</span>
                </label>
              ))}
            </div>
          </div>
          <Button type="submit">
            {isEditing ? '그룹 수정' : '그룹 생성'}
          </Button>
        </form>
      )}

      <div className="grid gap-4">
        {(groups || []).length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              아직 그룹이 없습니다
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              첫 번째 그룹을 만들어서 Cursor IDE에서 사용할 MCP 서버들을 관리해보세요.
            </p>
            <Button onClick={() => setIsCreating(true)}>
              첫 번째 그룹 만들기
            </Button>
          </div>
        ) : (
          (groups || []).map((group) => (
            <div key={group.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xl font-semibold">{group.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${group.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                      {group.isActive ? '활성' : '비활성'}
                    </span>
                  </div>
                  {group.description && (
                    <p className="text-gray-600 dark:text-gray-400 mt-1">{group.description}</p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {group.servers?.length || 0}개 서버 • {group.servers?.reduce((total, serverName) => {
                      const server = servers.find(s => s.name === serverName);
                      return total + (server?.tools?.length || 0);
                    }, 0)}개 도구
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleToggleActive(group.id, !group.isActive)}
                    variant={group.isActive ? 'outline' : 'default'}
                    className={group.isActive ? 'bg-green-100 text-green-800 border-green-300' : ''}
                  >
                    {group.isActive ? '✅ 활성' : '⭕ 비활성'}
                  </Button>
                  <Button onClick={() => handleEdit(group)} variant="outline">
                    수정
                  </Button>
                  <Button onClick={() => handleDelete(group.id)} variant="destructive">
                    삭제
                  </Button>
                </div>
              </div>
              <div className="mt-4">
                <h4 className="font-medium mb-2">포함된 서버:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {(group.servers || []).map((serverName) => {
                    const server = servers.find(s => s.name === serverName);
                    return (
                      <div key={serverName} className="flex items-center space-x-2 text-sm">
                        <span className={`w-2 h-2 rounded-full ${server?.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span>{serverName}</span>
                        <span className="text-gray-500">({server?.tools.length || 0}개 툴)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserGroupsPage;