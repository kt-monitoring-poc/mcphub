import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import { Switch } from '@/components/ui/ToggleGroup';
import { useSettingsData } from '@/hooks/useSettingsData';
import { useToast } from '@/contexts/ToastContext';
import { generateRandomKey } from '@/utils/key';
import { useAuth } from '@/contexts/AuthContext';
import { Key, Github, FileText, MessageSquare, Globe, Save, Eye, EyeOff } from 'lucide-react';

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
  const [userKeyId, setUserKeyId] = useState<string | null>(null);

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
        if (data.serviceTokens) {
          setApiKeys(prev => ({ ...prev, ...data.serviceTokens }));
        }
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
  const togglePasswordVisibility = (key: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
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
          {/* Firecrawl API Key */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Globe className="w-4 h-4 mr-2" />
              Firecrawl API Key
              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">필수</span>
            </label>
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
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Github className="w-4 h-4 mr-2" />
              GitHub Token
              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">필수</span>
            </label>
            <div className="relative">
              <input
                type={showPasswords.GITHUB_TOKEN ? 'text' : 'password'}
                value={apiKeys.GITHUB_TOKEN}
                onChange={(e) => setApiKeys(prev => ({ ...prev, GITHUB_TOKEN: e.target.value }))}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
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
            <p className="text-xs text-gray-500">GitHub API 접근에 필요</p>
          </div>

          {/* OpenAI API Key */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <MessageSquare className="w-4 h-4 mr-2" />
              OpenAI API Key
              <span className="ml-2 text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">선택</span>
            </label>
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
            <p className="text-xs text-gray-500">AI 기능에 필요 (선택사항)</p>
          </div>

          {/* Anthropic API Key */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <FileText className="w-4 h-4 mr-2" />
              Anthropic API Key
              <span className="ml-2 text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">선택</span>
            </label>
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
            <p className="text-xs text-gray-500">Claude AI 기능에 필요 (선택사항)</p>
          </div>

          {/* Upstash REST API Token */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Globe className="w-4 h-4 mr-2" />
              Upstash REST API Token
              <span className="ml-2 text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">선택</span>
            </label>
            <div className="relative">
              <input
                type={showPasswords.UPSTASH_REST_API_TOKEN ? 'text' : 'password'}
                value={apiKeys.UPSTASH_REST_API_TOKEN}
                onChange={(e) => setApiKeys(prev => ({ ...prev, UPSTASH_REST_API_TOKEN: e.target.value }))}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
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
            <p className="text-xs text-gray-500">Redis 캐싱에 필요 (선택사항)</p>
          </div>

          {/* Upstash REST API URL */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Globe className="w-4 h-4 mr-2" />
              Upstash REST API URL
              <span className="ml-2 text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">선택</span>
            </label>
            <div className="relative">
              <input
                type={showPasswords.UPSTASH_REST_API_URL ? 'text' : 'password'}
                value={apiKeys.UPSTASH_REST_API_URL}
                onChange={(e) => setApiKeys(prev => ({ ...prev, UPSTASH_REST_API_URL: e.target.value }))}
                placeholder="https://xxx.upstash.io"
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
            <p className="text-xs text-gray-500">Redis 연결 URL (선택사항)</p>
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