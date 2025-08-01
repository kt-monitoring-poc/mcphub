import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { toast } from '../contexts/ToastContext';
import { api } from '../utils/api';

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
      const response = await api.get('/api/user/groups');
      setGroups(response.data);
    } catch (error) {
      console.error('그룹 목록 로드 실패:', error);
      toast.error('그룹 목록을 불러오는데 실패했습니다.');
    }
  };

  const loadServers = async () => {
    try {
      const response = await api.get('/api/servers');
      setServers(response.data.filter((server: Server) => server.enabled));
    } catch (error) {
      console.error('서버 목록 로드 실패:', error);
      toast.error('서버 목록을 불러오는데 실패했습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/api/user/groups/${isEditing}`, formData);
        toast.success('그룹이 수정되었습니다.');
      } else {
        await api.post('/api/user/groups', formData);
        toast.success('새 그룹이 생성되었습니다.');
      }
      setIsCreating(false);
      setIsEditing(null);
      setFormData({ name: '', description: '', servers: [] });
      loadGroups();
    } catch (error) {
      console.error('그룹 저장 실패:', error);
      toast.error('그룹 저장에 실패했습니다.');
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
      await api.delete(`/api/user/groups/${groupId}`);
      toast.success('그룹이 삭제되었습니다.');
      loadGroups();
    } catch (error) {
      console.error('그룹 삭제 실패:', error);
      toast.error('그룹 삭제에 실패했습니다.');
    }
  };

  const handleToggleActive = async (groupId: string, isActive: boolean) => {
    try {
      await api.patch(`/api/user/groups/${groupId}/active`, { isActive });
      toast.success(`그룹이 ${isActive ? '활성화' : '비활성화'} 되었습니다.`);
      loadGroups();
    } catch (error) {
      console.error('그룹 상태 변경 실패:', error);
      toast.error('그룹 상태 변경에 실패했습니다.');
    }
  };

  return (
    <div className="container mx-auto p-4">
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
              {servers.map((server) => (
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
        {groups.map((group) => (
          <div key={group.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold">{group.name}</h3>
                {group.description && (
                  <p className="text-gray-600 dark:text-gray-400">{group.description}</p>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleToggleActive(group.id, !group.isActive)}
                  variant={group.isActive ? 'outline' : 'default'}
                >
                  {group.isActive ? '비활성화' : '활성화'}
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
                {group.servers.map((serverName) => {
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
        ))}
      </div>
    </div>
  );
};

export default UserGroupsPage;