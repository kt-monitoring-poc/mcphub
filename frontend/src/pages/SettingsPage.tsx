import ChangePasswordForm from '@/components/ChangePasswordForm';
import { Switch } from '@/components/ui/ToggleGroup';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Eye, EyeOff, FileText, Github, Globe, Key, MessageSquare, Plus, Save, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

// API Key 설정 인터페이스
interface ApiKeyConfig {
  key: string;
  label: string;
  placeholder: string;
  description: string;
  required: boolean;
  icon: React.ReactNode;
}

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  // Update current language when it changes
  useEffect(() => {
    setCurrentLanguage(i18n.language);
  }, [i18n.language]);

  // 기본 API Keys 설정
  const defaultApiKeyConfigs: ApiKeyConfig[] = [
    {
      key: 'FIRECRAWL_TOKEN',
      label: 'Firecrawl API Key',
      placeholder: 'fc-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      description: '웹 스크래핑 및 검색 기능에 필요',
      required: true,
      icon: <Globe className="w-4 h-4" />
    },
    {
      key: 'GITHUB_TOKEN',
      label: 'GitHub Token',
      placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      description: 'GitHub API 접근에 필요',
      required: true,
      icon: <Github className="w-4 h-4" />
    },
    {
      key: 'CONFLUENCE_TOKEN',
      label: 'Confluence API Token',
      placeholder: 'ATATT3xFfGF0...',
      description: 'Confluence MCP 서버 연결에 필요',
      required: false,
      icon: <FileText className="w-4 h-4" />
    },
    {
      key: 'JIRA_TOKEN',
      label: 'Jira API Token',
      placeholder: 'ATATT3xFfGF0...',
      description: 'Jira MCP 서버 연결에 필요',
      required: false,
      icon: <MessageSquare className="w-4 h-4" />
    }
  ];

  // API Keys 상태 - 동적으로 생성
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [customApiKeys, setCustomApiKeys] = useState<ApiKeyConfig[]>([]);

  const [savingKeys, setSavingKeys] = useState(false);
  const [userKeyId, setUserKeyId] = useState<string | null>(null);

  // 새로운 커스텀 API Key 추가
  const [newCustomKey, setNewCustomKey] = useState({
    key: '',
    label: '',
    placeholder: '',
    description: '',
    required: false
  });

  // 모든 API Key 설정을 합침
  const allApiKeyConfigs = [...defaultApiKeyConfigs, ...customApiKeys];

  // 초기 상태 설정
  useEffect(() => {
    const initialApiKeys: Record<string, string> = {};
    const initialShowPasswords: Record<string, boolean> = {};

    allApiKeyConfigs.forEach(config => {
      initialApiKeys[config.key] = '';
      initialShowPasswords[config.key] = false;
    });

    setApiKeys(initialApiKeys);
    setShowPasswords(initialShowPasswords);
  }, [customApiKeys]);

  // 사용자 키 ID 로드
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
        }
      }
    } catch (error) {
      console.error('사용자 키 ID 로드 오류:', error);
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

        if (data.success && data.data && data.data.serviceTokens) {
          setApiKeys(prev => ({ ...prev, ...data.data.serviceTokens }));
          showToast('API Keys 로드 완료', 'success');
        }
      } else {
        const errorData = await response.json();
        console.error('API Keys 로드 실패:', errorData);
      }
    } catch (error) {
      console.error('API Keys 로드 오류:', error);
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
  const togglePasswordVisibility = (key: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // 커스텀 API Key 추가
  const addCustomApiKey = () => {
    if (!newCustomKey.key || !newCustomKey.label) {
      showToast('키 이름과 라벨을 입력해주세요.', 'error');
      return;
    }

    // 중복 확인
    if (allApiKeyConfigs.some(config => config.key === newCustomKey.key)) {
      showToast('이미 존재하는 키 이름입니다.', 'error');
      return;
    }

    const customConfig: ApiKeyConfig = {
      key: newCustomKey.key,
      label: newCustomKey.label,
      placeholder: newCustomKey.placeholder || 'API Key를 입력하세요',
      description: newCustomKey.description || '사용자 정의 API Key',
      required: newCustomKey.required,
      icon: <Key className="w-4 h-4" />
    };

    setCustomApiKeys(prev => [...prev, customConfig]);
    setApiKeys(prev => ({ ...prev, [newCustomKey.key]: '' }));
    setShowPasswords(prev => ({ ...prev, [newCustomKey.key]: false }));

    // 입력 필드 초기화
    setNewCustomKey({
      key: '',
      label: '',
      placeholder: '',
      description: '',
      required: false
    });

    showToast('커스텀 API Key가 추가되었습니다.', 'success');
  };

  // 커스텀 API Key 삭제
  const removeCustomApiKey = (key: string) => {
    setCustomApiKeys(prev => prev.filter(config => config.key !== key));
    setApiKeys(prev => {
      const newKeys = { ...prev };
      delete newKeys[key];
      return newKeys;
    });
    setShowPasswords(prev => {
      const newShowPasswords = { ...prev };
      delete newShowPasswords[key];
      return newShowPasswords;
    });
    showToast('커스텀 API Key가 삭제되었습니다.', 'success');
  };

  const [installConfig, setInstallConfig] = useState<{
    pythonIndexUrl: string;
    npmRegistry: string;
  }>({
    pythonIndexUrl: '',
    npmRegistry: '',
  });

  const [tempSmartRoutingConfig, setTempSmartRoutingConfig] = useState<{
    dbUrl: string;
    openaiApiBaseUrl: string;
    openaiApiKey: string;
    openaiApiEmbeddingModel: string;
  }>({
    dbUrl: '',
    openaiApiBaseUrl: '',
    openaiApiKey: '',
    openaiApiEmbeddingModel: '',
  });

  const [routingConfig, setRoutingConfig] = useState<{
    enableGlobalRoute: boolean;
    enableGroupNameRoute: boolean;
    enableBearerAuth: boolean;
    bearerAuthKey: string;
    skipAuth: boolean;
  }>({
    enableGlobalRoute: false,
    enableGroupNameRoute: false,
    enableBearerAuth: false,
    bearerAuthKey: '',
    skipAuth: false,
  });

  const [smartRoutingConfig, setSmartRoutingConfig] = useState<{
    enabled: boolean;
    dbUrl: string;
    openaiApiBaseUrl: string;
    openaiApiKey: string;
    openaiApiEmbeddingModel: string;
  }>({
    enabled: false,
    dbUrl: '',
    openaiApiBaseUrl: '',
    openaiApiKey: '',
    openaiApiEmbeddingModel: '',
  });

  const [sectionsVisible, setSectionsVisible] = useState({
    routingConfig: false,
    installConfig: false,
    smartRoutingConfig: false,
    password: false,
  });

  const [loading, setLoading] = useState(false);

  const toggleSection = (section: 'routingConfig' | 'installConfig' | 'smartRoutingConfig' | 'password') => {
    setSectionsVisible(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleRoutingConfigChange = async (key: 'enableGlobalRoute' | 'enableGroupNameRoute' | 'enableBearerAuth' | 'bearerAuthKey' | 'skipAuth', value: boolean | string) => {
    setRoutingConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleBearerAuthKeyChange = (value: string) => {
    setRoutingConfig(prev => ({
      ...prev,
      bearerAuthKey: value
    }));
  };

  const saveBearerAuthKey = async () => {
    // Bearer Auth Key 저장 로직
  };

  const handleInstallConfigChange = (key: 'pythonIndexUrl' | 'npmRegistry', value: string) => {
    setInstallConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveInstallConfig = async (key: 'pythonIndexUrl' | 'npmRegistry') => {
    // Install Config 저장 로직
  };

  const handleSmartRoutingConfigChange = (key: 'dbUrl' | 'openaiApiBaseUrl' | 'openaiApiKey' | 'openaiApiEmbeddingModel', value: string) => {
    setTempSmartRoutingConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSmartRoutingConfig = async (key: 'dbUrl' | 'openaiApiBaseUrl' | 'openaiApiKey' | 'openaiApiEmbeddingModel') => {
    // Smart Routing Config 저장 로직
  };

  const handleSmartRoutingEnabledChange = async (value: boolean) => {
    setSmartRoutingConfig(prev => ({
      ...prev,
      enabled: value
    }));
  };

  const handlePasswordChangeSuccess = () => {
    showToast('비밀번호가 성공적으로 변경되었습니다.', 'success');
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setCurrentLanguage(lang);
  };

  // 관리자 권한 확인
  const isAdmin = user?.isAdmin || false;

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">{t('pages.settings.title')}</h1>

      {/* Language Settings - 모든 사용자 */}
      <div className="bg-white shadow rounded-lg py-4 px-6 mb-6 page-card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">{t('pages.settings.language')}</h2>
          <div className="flex space-x-3">
            <button
              className={`px-3 py-1.5 rounded-md transition-all duration-200 text-sm ${currentLanguage.startsWith('en')
                ? 'bg-blue-500 text-white btn-primary'
                : 'bg-blue-100 text-blue-800 hover:bg-blue-200 btn-secondary'
                }`}
              onClick={() => handleLanguageChange('en')}
            >
              English
            </button>
            <button
              className={`px-3 py-1.5 rounded-md transition-all duration-200 text-sm ${currentLanguage.startsWith('ko')
                ? 'bg-blue-500 text-white btn-primary'
                : 'bg-blue-100 text-blue-800 hover:bg-blue-200 btn-secondary'
                }`}
              onClick={() => handleLanguageChange('ko')}
            >
              한국어
            </button>
          </div>
        </div>
      </div>

      {/* Change Password - 모든 사용자 */}
      <div className="bg-white shadow rounded-lg py-4 px-6 mb-6">
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('password')}
        >
          <h2 className="font-semibold text-gray-800">{t('auth.changePassword')}</h2>
          <span className="text-gray-500">
            {sectionsVisible.password ? '▼' : '►'}
          </span>
        </div>

        {sectionsVisible.password && (
          <div className="max-w-lg mt-4">
            <ChangePasswordForm onSuccess={handlePasswordChangeSuccess} />
          </div>
        )}
      </div>

      {/* API Keys - 모든 사용자 */}
      <div className="bg-white shadow rounded-lg py-4 px-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Key className="w-5 h-5 text-indigo-600 mr-2" />
            <h2 className="font-semibold text-gray-800">API Keys</h2>
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
          {allApiKeyConfigs.map((config) => (
            <div key={config.key} className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <span className="mr-2">{config.icon}</span>
                {config.label}
                {config.required ? (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">필수</span>
                ) : (
                  <span className="ml-2 text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">선택</span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showPasswords[config.key] ? 'text' : 'password'}
                  value={apiKeys[config.key]}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, [config.key]: e.target.value }))}
                  placeholder={config.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility(config.key)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPasswords[config.key] ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
              <p className="text-xs text-gray-500">{config.description}</p>
              {customApiKeys.some(ck => ck.key === config.key) && (
                <button
                  type="button"
                  onClick={() => removeCustomApiKey(config.key)}
                  className="text-red-600 hover:text-red-900 text-sm"
                >
                  <Trash2 className="w-4 h-4 mr-1" /> 삭제
                </button>
              )}
            </div>
          ))}
        </div>

        {/* 커스텀 API Key 추가 폼 */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">커스텀 API Key 추가</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                키 이름 *
              </label>
              <input
                type="text"
                value={newCustomKey.key}
                onChange={(e) => setNewCustomKey(prev => ({ ...prev, key: e.target.value.toUpperCase() }))}
                placeholder="SLACK_TOKEN"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                표시 이름 *
              </label>
              <input
                type="text"
                value={newCustomKey.label}
                onChange={(e) => setNewCustomKey(prev => ({ ...prev, label: e.target.value }))}
                placeholder="Slack API Token"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                플레이스홀더
              </label>
              <input
                type="text"
                value={newCustomKey.placeholder}
                onChange={(e) => setNewCustomKey(prev => ({ ...prev, placeholder: e.target.value }))}
                placeholder="xoxb-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                설명
              </label>
              <input
                type="text"
                value={newCustomKey.description}
                onChange={(e) => setNewCustomKey(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Slack MCP 서버 연결에 필요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="required"
                checked={newCustomKey.required}
                onChange={(e) => setNewCustomKey(prev => ({ ...prev, required: e.target.checked }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="required" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                필수 API Key로 설정
              </label>
            </div>
            <button
              type="button"
              onClick={addCustomApiKey}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4 mr-2" /> 추가
            </button>
          </div>
        </div>

        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            💡 <strong>API Keys 사용법:</strong> 각 서비스의 API Key를 입력하면 MCP 서버 호출 시 자동으로 사용됩니다.
            입력한 키는 안전하게 암호화되어 저장되며, MCPHub Key와 연결됩니다.
          </p>
        </div>
      </div>

      {/* 관리자 전용 설정들 */}
      {isAdmin && (
        <>
          {/* Smart Routing Configuration Settings */}
          <div className="bg-white shadow rounded-lg py-4 px-6 mb-6 page-card">
            <div
              className="flex justify-between items-center cursor-pointer transition-colors duration-200 hover:text-blue-600"
              onClick={() => toggleSection('smartRoutingConfig')}
            >
              <h2 className="font-semibold text-gray-800">{t('pages.settings.smartRouting')}</h2>
              <span className="text-gray-500 transition-transform duration-200">
                {sectionsVisible.smartRoutingConfig ? '▼' : '►'}
              </span>
            </div>

            {sectionsVisible.smartRoutingConfig && (
              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <h3 className="font-medium text-gray-700">{t('settings.enableSmartRouting')}</h3>
                    <p className="text-sm text-gray-500">{t('settings.enableSmartRoutingDescription')}</p>
                  </div>
                  <Switch
                    disabled={loading}
                    checked={smartRoutingConfig.enabled}
                    onCheckedChange={(checked) => handleSmartRoutingEnabledChange(checked)}
                  />
                </div>

                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="mb-2">
                    <h3 className="font-medium text-gray-700">
                      <span className="text-red-500 px-1">*</span>{t('settings.dbUrl')}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={tempSmartRoutingConfig.dbUrl}
                      onChange={(e) => handleSmartRoutingConfigChange('dbUrl', e.target.value)}
                      placeholder={t('settings.dbUrlPlaceholder')}
                      className="flex-1 mt-1 block w-full py-2 px-3 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 form-input"
                      disabled={loading}
                    />
                    <button
                      onClick={() => saveSmartRoutingConfig('dbUrl')}
                      disabled={loading}
                      className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50 btn-primary"
                    >
                      {t('common.save')}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="mb-2">
                    <h3 className="font-medium text-gray-700">
                      <span className="text-red-500 px-1">*</span>{t('settings.openaiApiKey')}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="password"
                      value={tempSmartRoutingConfig.openaiApiKey}
                      onChange={(e) => handleSmartRoutingConfigChange('openaiApiKey', e.target.value)}
                      placeholder={t('settings.openaiApiKeyPlaceholder')}
                      className="flex-1 mt-1 block w-full py-2 px-3 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300"
                      disabled={loading}
                    />
                    <button
                      onClick={() => saveSmartRoutingConfig('openaiApiKey')}
                      disabled={loading}
                      className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50 btn-primary"
                    >
                      {t('common.save')}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="mb-2">
                    <h3 className="font-medium text-gray-700">{t('settings.openaiApiBaseUrl')}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={tempSmartRoutingConfig.openaiApiBaseUrl}
                      onChange={(e) => handleSmartRoutingConfigChange('openaiApiBaseUrl', e.target.value)}
                      placeholder={t('settings.openaiApiBaseUrlPlaceholder')}
                      className="flex-1 mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm form-input"
                      disabled={loading}
                    />
                    <button
                      onClick={() => saveSmartRoutingConfig('openaiApiBaseUrl')}
                      disabled={loading}
                      className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50 btn-primary"
                    >
                      {t('common.save')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Routing Configuration Settings */}
          <div className="bg-white shadow rounded-lg py-4 px-6 mb-6">
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => toggleSection('routingConfig')}
            >
              <h2 className="font-semibold text-gray-800">{t('settings.routingConfig')}</h2>
              <span className="text-gray-500">
                {sectionsVisible.routingConfig ? '▼' : '►'}
              </span>
            </div>

            {sectionsVisible.routingConfig && (
              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <h3 className="font-medium text-gray-700">{t('settings.enableGlobalRoute')}</h3>
                    <p className="text-sm text-gray-500">{t('settings.enableGlobalRouteDescription')}</p>
                  </div>
                  <Switch
                    disabled={loading}
                    checked={routingConfig.enableGlobalRoute}
                    onCheckedChange={(checked) => handleRoutingConfigChange('enableGlobalRoute', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <h3 className="font-medium text-gray-700">{t('settings.enableGroupNameRoute')}</h3>
                    <p className="text-sm text-gray-500">{t('settings.enableGroupNameRouteDescription')}</p>
                  </div>
                  <Switch
                    disabled={loading}
                    checked={routingConfig.enableGroupNameRoute}
                    onCheckedChange={(checked) => handleRoutingConfigChange('enableGroupNameRoute', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <h3 className="font-medium text-gray-700">{t('settings.skipAuth')}</h3>
                    <p className="text-sm text-gray-500">{t('settings.skipAuthDescription')}</p>
                  </div>
                  <Switch
                    disabled={loading}
                    checked={routingConfig.skipAuth}
                    onCheckedChange={(checked) => handleRoutingConfigChange('skipAuth', checked)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Installation Configuration Settings */}
          <div className="bg-white shadow rounded-lg py-4 px-6 mb-6">
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => toggleSection('installConfig')}
            >
              <h2 className="font-semibold text-gray-800">{t('settings.installConfig')}</h2>
              <span className="text-gray-500">
                {sectionsVisible.installConfig ? '▼' : '►'}
              </span>
            </div>

            {sectionsVisible.installConfig && (
              <div className="space-y-4 mt-4">
                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="mb-2">
                    <h3 className="font-medium text-gray-700">{t('settings.pythonIndexUrl')}</h3>
                    <p className="text-sm text-gray-500">{t('settings.pythonIndexUrlDescription')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={installConfig.pythonIndexUrl}
                      onChange={(e) => handleInstallConfigChange('pythonIndexUrl', e.target.value)}
                      placeholder={t('settings.pythonIndexUrlPlaceholder')}
                      className="flex-1 mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm form-input"
                      disabled={loading}
                    />
                    <button
                      onClick={() => saveInstallConfig('pythonIndexUrl')}
                      disabled={loading}
                      className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50 btn-primary"
                    >
                      {t('common.save')}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="mb-2">
                    <h3 className="font-medium text-gray-700">{t('settings.npmRegistry')}</h3>
                    <p className="text-sm text-gray-500">{t('settings.npmRegistryDescription')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={installConfig.npmRegistry}
                      onChange={(e) => handleInstallConfigChange('npmRegistry', e.target.value)}
                      placeholder={t('settings.npmRegistryPlaceholder')}
                      className="flex-1 mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm form-input"
                      disabled={loading}
                    />
                    <button
                      onClick={() => saveInstallConfig('npmRegistry')}
                      disabled={loading}
                      className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50 btn-primary"
                    >
                      {t('common.save')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SettingsPage;