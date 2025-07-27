import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { Key, Github, Globe, Save, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

const ApiKeysPage: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();

  // API Keys 상태
  const [apiKeys, setApiKeys] = useState({
    FIRECRAWL_API_KEY: '',
    GITHUB_TOKEN: '',
    OPENAI_API_KEY: '',
    ANTHROPIC_API_KEY: '',
    UPSTASH_REST_API_TOKEN: '',
    UPSTASH_REST_API_URL: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    FIRECRAWL_API_KEY: false,
    GITHUB_TOKEN: false,
    OPENAI_API_KEY: false,
    ANTHROPIC_API_KEY: false,
    UPSTASH_REST_API_TOKEN: false,
    UPSTASH_REST_API_URL: false
  });

  const [savingKeys, setSavingKeys] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userKeyId, setUserKeyId] = useState<string | null>(null);

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
        const data = await response.json();
        if (data.serviceTokens) {
          setApiKeys(prev => ({ ...prev, ...data.serviceTokens }));
        }
      }
    } catch (error) {
      console.error('API Keys 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // API Keys 저장 함수
  const handleSaveApiKeys = async () => {
    if (!userKeyId) {
      showToast('MCPHub Key가 필요합니다. 먼저 키를 생성해주세요.', 'error');
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
        showToast('API Keys가 저장되었습니다.', 'success');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API Keys 저장 실패');
      }
    } catch (error) {
      console.error('API Keys 저장 오류:', error);
      showToast('API Keys 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setSavingKeys(false);
    }
  };

  // 비밀번호 표시/숨김 토글
  const togglePasswordVisibility = (key: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // API 키 상태 확인
  const getKeyStatus = (key: string) => {
    const value = apiKeys[key as keyof typeof apiKeys];
    if (!value) return 'missing';
    if (value.length < 10) return 'invalid';
    return 'valid';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'invalid':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'missing':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'valid':
        return '유효함';
      case 'invalid':
        return '형식 오류';
      case 'missing':
        return '미설정';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">API Keys 관리</h1>
        <p className="text-gray-600">
          MCP 서버에서 사용할 API 키들을 설정하세요. 
          <span className="font-semibold text-indigo-600"> {user?.githubUsername || user?.username}</span>님의 개인 설정입니다.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Key className="w-6 h-6 text-indigo-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-800">API Keys</h2>
          </div>
          <button
            onClick={handleSaveApiKeys}
            disabled={savingKeys}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {savingKeys ? '저장 중...' : '저장'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Firecrawl API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Globe className="w-4 h-4 mr-2" />
                Firecrawl API Key
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">필수</span>
              </label>
              <div className="flex items-center">
                {getStatusIcon(getKeyStatus('FIRECRAWL_API_KEY'))}
                <span className="ml-1 text-xs text-gray-500">
                  {getStatusText(getKeyStatus('FIRECRAWL_API_KEY'))}
                </span>
              </div>
            </div>
            <div className="relative">
              <input
                type={showPasswords.FIRECRAWL_API_KEY ? 'text' : 'password'}
                value={apiKeys.FIRECRAWL_API_KEY}
                onChange={(e) => setApiKeys(prev => ({ ...prev, FIRECRAWL_API_KEY: e.target.value }))}
                placeholder="fc-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('FIRECRAWL_API_KEY')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPasswords.FIRECRAWL_API_KEY ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
            <p className="text-xs text-gray-500">웹 스크래핑 및 검색 기능에 필요</p>
          </div>

          {/* GitHub Token */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Github className="w-4 h-4 mr-2" />
                GitHub Token
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">선택</span>
              </label>
              <div className="flex items-center">
                {getStatusIcon(getKeyStatus('GITHUB_TOKEN'))}
                <span className="ml-1 text-xs text-gray-500">
                  {getStatusText(getKeyStatus('GITHUB_TOKEN'))}
                </span>
              </div>
            </div>
            <div className="relative">
              <input
                type={showPasswords.GITHUB_TOKEN ? 'text' : 'password'}
                value={apiKeys.GITHUB_TOKEN}
                onChange={(e) => setApiKeys(prev => ({ ...prev, GITHUB_TOKEN: e.target.value }))}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('GITHUB_TOKEN')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPasswords.GITHUB_TOKEN ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
            <p className="text-xs text-gray-500">GitHub 저장소 및 이슈 관리에 필요</p>
          </div>

          {/* OpenAI API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Key className="w-4 h-4 mr-2" />
                OpenAI API Key
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">선택</span>
              </label>
              <div className="flex items-center">
                {getStatusIcon(getKeyStatus('OPENAI_API_KEY'))}
                <span className="ml-1 text-xs text-gray-500">
                  {getStatusText(getKeyStatus('OPENAI_API_KEY'))}
                </span>
              </div>
            </div>
            <div className="relative">
              <input
                type={showPasswords.OPENAI_API_KEY ? 'text' : 'password'}
                value={apiKeys.OPENAI_API_KEY}
                onChange={(e) => setApiKeys(prev => ({ ...prev, OPENAI_API_KEY: e.target.value }))}
                placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('OPENAI_API_KEY')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPasswords.OPENAI_API_KEY ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
            <p className="text-xs text-gray-500">AI 모델 호출에 필요</p>
          </div>

          {/* Anthropic API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Key className="w-4 h-4 mr-2" />
                Anthropic API Key
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">선택</span>
              </label>
              <div className="flex items-center">
                {getStatusIcon(getKeyStatus('ANTHROPIC_API_KEY'))}
                <span className="ml-1 text-xs text-gray-500">
                  {getStatusText(getKeyStatus('ANTHROPIC_API_KEY'))}
                </span>
              </div>
            </div>
            <div className="relative">
              <input
                type={showPasswords.ANTHROPIC_API_KEY ? 'text' : 'password'}
                value={apiKeys.ANTHROPIC_API_KEY}
                onChange={(e) => setApiKeys(prev => ({ ...prev, ANTHROPIC_API_KEY: e.target.value }))}
                placeholder="sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('ANTHROPIC_API_KEY')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPasswords.ANTHROPIC_API_KEY ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
            <p className="text-xs text-gray-500">Claude 모델 호출에 필요</p>
          </div>

          {/* Upstash REST API Token */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Key className="w-4 h-4 mr-2" />
                Upstash REST API Token
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">선택</span>
              </label>
              <div className="flex items-center">
                {getStatusIcon(getKeyStatus('UPSTASH_REST_API_TOKEN'))}
                <span className="ml-1 text-xs text-gray-500">
                  {getStatusText(getKeyStatus('UPSTASH_REST_API_TOKEN'))}
                </span>
              </div>
            </div>
            <div className="relative">
              <input
                type={showPasswords.UPSTASH_REST_API_TOKEN ? 'text' : 'password'}
                value={apiKeys.UPSTASH_REST_API_TOKEN}
                onChange={(e) => setApiKeys(prev => ({ ...prev, UPSTASH_REST_API_TOKEN: e.target.value }))}
                placeholder="AYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('UPSTASH_REST_API_TOKEN')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPasswords.UPSTASH_REST_API_TOKEN ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
            <p className="text-xs text-gray-500">Context7 서비스에 필요</p>
          </div>

          {/* Upstash REST API URL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Globe className="w-4 h-4 mr-2" />
                Upstash REST API URL
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">선택</span>
              </label>
              <div className="flex items-center">
                {getStatusIcon(getKeyStatus('UPSTASH_REST_API_URL'))}
                <span className="ml-1 text-xs text-gray-500">
                  {getStatusText(getKeyStatus('UPSTASH_REST_API_URL'))}
                </span>
              </div>
            </div>
            <div className="relative">
              <input
                type={showPasswords.UPSTASH_REST_API_URL ? 'text' : 'password'}
                value={apiKeys.UPSTASH_REST_API_URL}
                onChange={(e) => setApiKeys(prev => ({ ...prev, UPSTASH_REST_API_URL: e.target.value }))}
                placeholder="https://xxx-xxx-xxx.upstash.io"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('UPSTASH_REST_API_URL')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPasswords.UPSTASH_REST_API_URL ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
            <p className="text-xs text-gray-500">Context7 서비스에 필요</p>
          </div>
        </div>

        {/* 사용 가이드 */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">💡 사용 가이드</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Firecrawl API Key</strong>는 웹 스크래핑 기능에 필수입니다.</li>
            <li>• 다른 API 키들은 선택사항이며, 해당 서비스를 사용할 때만 필요합니다.</li>
            <li>• API 키는 안전하게 암호화되어 저장됩니다.</li>
            <li>• Cursor에서 MCPHub를 사용할 때 이 API 키들이 자동으로 적용됩니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ApiKeysPage; 