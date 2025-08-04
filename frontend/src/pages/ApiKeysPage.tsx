import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { AlertCircle, Brain, CheckCircle, Database, Eye, EyeOff, Github, Globe, Save } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const ApiKeysPage: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();

  // API Keys 상태 - 새로운 MCP 서버들 추가
  const [apiKeys, setApiKeys] = useState({
    FIRECRAWL_TOKEN: '',
    GITHUB_TOKEN: '',
    OPENAI_API_KEY: '',
    ANTHROPIC_API_KEY: '',
    UPSTASH_REST_API_TOKEN: '',
    UPSTASH_REST_API_URL: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    FIRECRAWL_TOKEN: false,
    GITHUB_TOKEN: false,
    OPENAI_API_KEY: false,
    ANTHROPIC_API_KEY: false,
    UPSTASH_REST_API_TOKEN: false,
    UPSTASH_REST_API_URL: false
  });

  const [savingKeys, setSavingKeys] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userKeyId, setUserKeyId] = useState<string | null>(null);

  // API Key 그룹별 설정
  const apiKeyGroups = [
    {
      title: "웹 스크래핑",
      icon: <Database className="w-5 h-5" />,
      keys: [
        {
          key: 'FIRECRAWL_TOKEN',
          label: 'Firecrawl Token',
          description: '웹 스크래핑 및 데이터 추출을 위한 Firecrawl API 키',
          placeholder: 'fc-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          required: false
        }
      ]
    },
    {
      title: "개발 도구",
      icon: <Github className="w-5 h-5" />,
      keys: [
        {
          key: 'GITHUB_TOKEN',
          label: 'GitHub Token',
          description: 'GitHub 저장소 및 이슈 관리를 위한 Personal Access Token',
          placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          required: false
        }
      ]
    },
    {
      title: "AI 모델",
      icon: <Brain className="w-5 h-5" />,
      keys: [
        {
          key: 'OPENAI_API_KEY',
          label: 'OpenAI API Key',
          description: 'OpenAI GPT 모델 사용을 위한 API 키',
          placeholder: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          required: false
        },
        {
          key: 'ANTHROPIC_API_KEY',
          label: 'Anthropic API Key',
          description: 'Anthropic Claude 모델 사용을 위한 API 키',
          placeholder: 'sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          required: false
        }
      ]
    },
    {
      title: "기타 서비스",
      icon: <Globe className="w-5 h-5" />,
      keys: [
        {
          key: 'UPSTASH_REST_API_TOKEN',
          label: 'Upstash REST API Token',
          description: 'Upstash Redis 및 기타 서비스 사용을 위한 토큰',
          placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          required: false
        },
        {
          key: 'UPSTASH_REST_API_URL',
          label: 'Upstash REST API URL',
          description: 'Upstash 서비스 엔드포인트 URL',
          placeholder: 'https://xxx-xxx-xxx.upstash.io',
          required: false
        }
      ]
    }
  ];

  // API Keys 로드
  useEffect(() => {
    loadUserKeyId();
  }, []);

  const loadUserKeyId = async () => {
    try {
      const token = localStorage.getItem('mcphub_token');
      const response = await fetch('/api/oauth/keys', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token || ''
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.length > 0) {
          setUserKeyId(result.data[0].id); // 첫 번째 키 사용
          // 기존 서비스 토큰이 있다면 로드
          loadApiKeys(result.data[0].id);
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('사용자 키 ID 로드 오류:', error);
      setLoading(false);
    }
  };

  const loadApiKeys = async (keyId: string) => {
    try {
      const token = localStorage.getItem('mcphub_token');
      const response = await fetch(`/api/oauth/keys/${keyId}/tokens`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token || ''
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setApiKeys(prev => ({ ...prev, ...result.data }));
        }
      }
    } catch (error) {
      console.error('API Keys 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveKeys = async () => {
    if (!userKeyId) {
      showToast('MCPHub Key가 필요합니다. 먼저 MCPHub Key를 생성해주세요.', 'error');
      return;
    }

    setSavingKeys(true);
    try {
      const token = localStorage.getItem('mcphub_token');
      const response = await fetch(`/api/oauth/keys/${userKeyId}/tokens`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token || ''
        },
        body: JSON.stringify(apiKeys)
      });

      if (response.ok) {
        showToast('API Keys가 성공적으로 저장되었습니다!', 'success');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'API Keys 저장 실패');
      }
    } catch (error) {
      console.error('API Keys 저장 오류:', error);
      showToast('API Keys 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setSavingKeys(false);
    }
  };

  const hasValidKeys = () => {
    return Object.values(apiKeys).some(value => value.trim() !== '');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          API Keys 관리
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Cursor IDE에서 사용할 MCP 서버들의 API 키를 설정하세요.
          각 서비스별로 필요한 키를 입력하면 MCPHub를 통해 자동으로 연결됩니다.
        </p>
      </div>

      {!userKeyId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
            <span className="text-yellow-800">
              MCPHub Key가 필요합니다. 먼저 <strong>MCPHub Keys</strong> 페이지에서 키를 생성해주세요.
            </span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {apiKeyGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                {group.icon}
                <h3 className="ml-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {group.title}
                </h3>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {group.keys.map((keyConfig) => (
                <div key={keyConfig.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {keyConfig.label}
                      {keyConfig.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility(keyConfig.key)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPasswords[keyConfig.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <input
                    type={showPasswords[keyConfig.key] ? "text" : "password"}
                    value={apiKeys[keyConfig.key]}
                    onChange={(e) => handleInputChange(keyConfig.key, e.target.value)}
                    placeholder={keyConfig.placeholder}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {keyConfig.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSaveKeys}
          disabled={savingKeys || !userKeyId || !hasValidKeys()}
          className={`px-6 py-2 rounded-md text-white font-medium flex items-center space-x-2 ${savingKeys || !userKeyId || !hasValidKeys()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
            }`}
        >
          {savingKeys ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>저장 중...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>API Keys 저장</span>
            </>
          )}
        </button>
      </div>

      {hasValidKeys() && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-800">
              API Keys가 설정되었습니다. Cursor IDE에서 MCPHub를 통해 해당 서비스들을 사용할 수 있습니다.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiKeysPage; 