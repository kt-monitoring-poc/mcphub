// React 라이브러리와 필요한 훅들을 가져옵니다
// useState: 컴포넌트 내에서 상태를 관리하는 훅
// useEffect: 컴포넌트 생명주기와 관련된 부수 효과를 처리하는 훅
import React, { useState, useEffect } from 'react';

// 다국어 지원을 위한 react-i18next 라이브러리를 가져옵니다
// useTranslation: 번역 함수와 현재 언어 정보를 제공하는 훅
import { useTranslation } from 'react-i18next';

// React Router의 페이지 이동 기능을 가져옵니다
// useNavigate: 프로그래밍 방식으로 페이지를 이동시키는 훅
import { useNavigate } from 'react-router-dom';

// UI 컴포넌트들을 가져옵니다
import ChangePasswordForm from '@/components/ChangePasswordForm';  // 비밀번호 변경 폼
import { Switch } from '@/components/ui/ToggleGroup';              // 토글 스위치 컴포넌트

// 커스텀 훅들을 가져옵니다
import { useSettingsData } from '@/hooks/useSettingsData';  // 설정 데이터 관리 훅
import { useToast } from '@/contexts/ToastContext';         // 알림 메시지 표시 훅

// 유틸리티 함수를 가져옵니다
import { generateRandomKey } from '@/utils/key';  // 랜덤 키 생성 함수

/**
 * SettingsPage 컴포넌트: 애플리케이션 설정 페이지
 * 
 * 이 컴포넌트는 다음과 같은 설정들을 관리합니다:
 * - 언어 설정 (한국어/영어/중국어)
 * - 스마트 라우팅 설정 (AI 기반 서버 선택)
 * - 라우팅 설정 (인증, 글로벌 라우트 등)
 * - 설치 설정 (Python, NPM 레지스트리)
 * - 비밀번호 변경
 * 
 * 각 설정 섹션은 접을 수 있는 형태로 구성되어 있어서
 * 사용자가 필요한 설정만 펼쳐서 볼 수 있습니다.
 */
const SettingsPage: React.FC = () => {
  // 다국어 지원 훅 사용
  // t: 번역 함수 (예: t('settings.title') → "설정")
  // i18n: 현재 언어 정보 (예: i18n.language → "ko", "en", "zh")
  const { t, i18n } = useTranslation();
  
  // 페이지 이동을 위한 navigate 함수
  const navigate = useNavigate();
  
  // 알림 메시지 표시를 위한 showToast 함수
  const { showToast } = useToast();
  
  // 현재 언어 상태 관리
  // useState는 컴포넌트의 상태를 관리하는 React 훅입니다
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  // 언어가 변경될 때 현재 언어 상태를 업데이트
  // useEffect는 컴포넌트가 렌더링된 후 실행되는 부수 효과를 처리합니다
  // 의존성 배열 [i18n.language]에 i18n.language가 포함되어 있어서, 언어가 변경될 때마다 실행됩니다
  useEffect(() => {
    setCurrentLanguage(i18n.language);
  }, [i18n.language]);

  // 설치 설정 상태 관리
  // TypeScript에서 객체의 타입을 인라인으로 정의
  const [installConfig, setInstallConfig] = useState<{
    pythonIndexUrl: string;  // Python 패키지 인덱스 URL
    npmRegistry: string;     // NPM 레지스트리 URL
  }>({
    pythonIndexUrl: '',
    npmRegistry: '',
  });

  // 스마트 라우팅 임시 설정 상태 관리
  // 사용자가 입력 중인 값들을 임시로 저장하는 상태
  const [tempSmartRoutingConfig, setTempSmartRoutingConfig] = useState<{
    dbUrl: string;                    // 데이터베이스 URL
    openaiApiBaseUrl: string;         // OpenAI API 기본 URL
    openaiApiKey: string;             // OpenAI API 키
    openaiApiEmbeddingModel: string;  // OpenAI 임베딩 모델명
  }>({
    dbUrl: '',
    openaiApiBaseUrl: '',
    openaiApiKey: '',
    openaiApiEmbeddingModel: '',
  });

  // useSettingsData 훅에서 설정 관련 데이터와 함수들을 가져옵니다
  // 이 훅은 서버와의 통신을 담당하며, 설정 데이터를 관리합니다
  const {
    routingConfig,                    // 현재 라우팅 설정
    tempRoutingConfig,                // 임시 라우팅 설정
    setTempRoutingConfig,             // 임시 라우팅 설정 변경 함수
    installConfig: savedInstallConfig, // 저장된 설치 설정
    smartRoutingConfig,               // 현재 스마트 라우팅 설정
    loading,                          // 로딩 상태
    updateRoutingConfig,              // 라우팅 설정 업데이트 함수
    updateRoutingConfigBatch,         // 라우팅 설정 일괄 업데이트 함수
    updateInstallConfig,              // 설치 설정 업데이트 함수
    updateSmartRoutingConfig,         // 스마트 라우팅 설정 업데이트 함수
    updateSmartRoutingConfigBatch     // 스마트 라우팅 설정 일괄 업데이트 함수
  } = useSettingsData();

  // 저장된 설치 설정이 변경될 때 로컬 상태를 업데이트
  useEffect(() => {
    if (savedInstallConfig) {
      setInstallConfig(savedInstallConfig);
    }
  }, [savedInstallConfig]);

  // 스마트 라우팅 설정이 변경될 때 임시 상태를 업데이트
  useEffect(() => {
    if (smartRoutingConfig) {
      setTempSmartRoutingConfig({
        dbUrl: smartRoutingConfig.dbUrl || '',
        openaiApiBaseUrl: smartRoutingConfig.openaiApiBaseUrl || '',
        openaiApiKey: smartRoutingConfig.openaiApiKey || '',
        openaiApiEmbeddingModel: smartRoutingConfig.openaiApiEmbeddingModel || '',
      });
    }
  }, [smartRoutingConfig]);

  // 각 설정 섹션의 펼침/접힘 상태 관리
  // 사용자가 어떤 설정 섹션을 보고 있는지 추적합니다
  const [sectionsVisible, setSectionsVisible] = useState({
    routingConfig: false,      // 라우팅 설정 섹션
    installConfig: false,      // 설치 설정 섹션
    smartRoutingConfig: false, // 스마트 라우팅 설정 섹션
    password: false            // 비밀번호 변경 섹션
  });

  /**
   * 설정 섹션의 펼침/접힘 상태를 토글하는 함수
   * @param section - 토글할 섹션 이름
   */
  const toggleSection = (section: 'routingConfig' | 'installConfig' | 'smartRoutingConfig' | 'password') => {
    setSectionsVisible(prev => ({
      ...prev,  // 기존 상태를 복사
      [section]: !prev[section]  // 해당 섹션의 상태를 반전
    }));
  };

  const handleRoutingConfigChange = async (key: 'enableGlobalRoute' | 'enableGroupNameRoute' | 'enableBearerAuth' | 'bearerAuthKey' | 'skipAuth', value: boolean | string) => {
    // If enableBearerAuth is turned on and there's no key, generate one first
    if (key === 'enableBearerAuth' && value === true) {
      if (!tempRoutingConfig.bearerAuthKey && !routingConfig.bearerAuthKey) {
        const newKey = generateRandomKey();
        handleBearerAuthKeyChange(newKey);

        // Update both enableBearerAuth and bearerAuthKey in a single call
        const success = await updateRoutingConfigBatch({
          enableBearerAuth: true,
          bearerAuthKey: newKey
        });

        if (success) {
          // Update tempRoutingConfig to reflect the saved values
          setTempRoutingConfig(prev => ({
            ...prev,
            bearerAuthKey: newKey
          }));
        }
        return;
      }
    }

    await updateRoutingConfig(key, value);
  };

  const handleBearerAuthKeyChange = (value: string) => {
    setTempRoutingConfig(prev => ({
      ...prev,
      bearerAuthKey: value
    }));
  };

  const saveBearerAuthKey = async () => {
    await updateRoutingConfig('bearerAuthKey', tempRoutingConfig.bearerAuthKey);
  };

  const handleInstallConfigChange = (key: 'pythonIndexUrl' | 'npmRegistry', value: string) => {
    setInstallConfig({
      ...installConfig,
      [key]: value
    });
  };

  const saveInstallConfig = async (key: 'pythonIndexUrl' | 'npmRegistry') => {
    await updateInstallConfig(key, installConfig[key]);
  };

  const handleSmartRoutingConfigChange = (key: 'dbUrl' | 'openaiApiBaseUrl' | 'openaiApiKey' | 'openaiApiEmbeddingModel', value: string) => {
    setTempSmartRoutingConfig({
      ...tempSmartRoutingConfig,
      [key]: value
    });
  };

  const saveSmartRoutingConfig = async (key: 'dbUrl' | 'openaiApiBaseUrl' | 'openaiApiKey' | 'openaiApiEmbeddingModel') => {
    await updateSmartRoutingConfig(key, tempSmartRoutingConfig[key]);
  };

  const handleSmartRoutingEnabledChange = async (value: boolean) => {
    // If enabling Smart Routing, validate required fields and save any unsaved changes
    if (value) {
      const currentDbUrl = tempSmartRoutingConfig.dbUrl || smartRoutingConfig.dbUrl;
      const currentOpenaiApiKey = tempSmartRoutingConfig.openaiApiKey || smartRoutingConfig.openaiApiKey;

      if (!currentDbUrl || !currentOpenaiApiKey) {
        const missingFields = [];
        if (!currentDbUrl) missingFields.push(t('settings.dbUrl'));
        if (!currentOpenaiApiKey) missingFields.push(t('settings.openaiApiKey'));

        showToast(t('settings.smartRoutingValidationError', {
          fields: missingFields.join(', ')
        }));
        return;
      }

      // Prepare updates object with unsaved changes and enabled status
      const updates: any = { enabled: value };

      // Check for unsaved changes and include them in the batch update
      if (tempSmartRoutingConfig.dbUrl !== smartRoutingConfig.dbUrl) {
        updates.dbUrl = tempSmartRoutingConfig.dbUrl;
      }
      if (tempSmartRoutingConfig.openaiApiBaseUrl !== smartRoutingConfig.openaiApiBaseUrl) {
        updates.openaiApiBaseUrl = tempSmartRoutingConfig.openaiApiBaseUrl;
      }
      if (tempSmartRoutingConfig.openaiApiKey !== smartRoutingConfig.openaiApiKey) {
        updates.openaiApiKey = tempSmartRoutingConfig.openaiApiKey;
      }
      if (tempSmartRoutingConfig.openaiApiEmbeddingModel !== smartRoutingConfig.openaiApiEmbeddingModel) {
        updates.openaiApiEmbeddingModel = tempSmartRoutingConfig.openaiApiEmbeddingModel;
      }

      // Save all changes in a single batch update
      await updateSmartRoutingConfigBatch(updates);
    } else {
      // If disabling, just update the enabled status
      await updateSmartRoutingConfig('enabled', value);
    }
  };

  const handlePasswordChangeSuccess = () => {
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  const handleLanguageChange = (lang: string) => {
    localStorage.setItem('i18nextLng', lang);
    window.location.reload();
  };

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">{t('pages.settings.title')}</h1>

      {/* Language Settings */}
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
              className={`px-3 py-1.5 rounded-md transition-all duration-200 text-sm ${currentLanguage.startsWith('zh')
                ? 'bg-blue-500 text-white btn-primary'
                : 'bg-blue-100 text-blue-800 hover:bg-blue-200 btn-secondary'
                }`}
              onClick={() => handleLanguageChange('zh')}
            >
              中文
            </button>
          </div>
        </div>
      </div>

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

            <div className="p-3 bg-gray-50 rounded-md">
              <div className="mb-2">
                <h3 className="font-medium text-gray-700">{t('settings.openaiApiEmbeddingModel')}</h3>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={tempSmartRoutingConfig.openaiApiEmbeddingModel}
                  onChange={(e) => handleSmartRoutingConfigChange('openaiApiEmbeddingModel', e.target.value)}
                  placeholder={t('settings.openaiApiEmbeddingModelPlaceholder')}
                  className="flex-1 mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm form-input"
                  disabled={loading}
                />
                <button
                  onClick={() => saveSmartRoutingConfig('openaiApiEmbeddingModel')}
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

      {/* Route Configuration Settings */}
      <div className="bg-white shadow rounded-lg py-4 px-6 mb-6">
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('routingConfig')}
        >
          <h2 className="font-semibold text-gray-800">{t('pages.settings.routeConfig')}</h2>
          <span className="text-gray-500">
            {sectionsVisible.routingConfig ? '▼' : '►'}
          </span>
        </div>

        {sectionsVisible.routingConfig && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div>
                <h3 className="font-medium text-gray-700">{t('settings.enableBearerAuth')}</h3>
                <p className="text-sm text-gray-500">{t('settings.enableBearerAuthDescription')}</p>
              </div>
              <Switch
                disabled={loading}
                checked={routingConfig.enableBearerAuth}
                onCheckedChange={(checked) => handleRoutingConfigChange('enableBearerAuth', checked)}
              />
            </div>

            {routingConfig.enableBearerAuth && (
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="mb-2">
                  <h3 className="font-medium text-gray-700">{t('settings.bearerAuthKey')}</h3>
                  <p className="text-sm text-gray-500">{t('settings.bearerAuthKeyDescription')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={tempRoutingConfig.bearerAuthKey}
                    onChange={(e) => handleBearerAuthKeyChange(e.target.value)}
                    placeholder={t('settings.bearerAuthKeyPlaceholder')}
                    className="flex-1 mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm form-input"
                    disabled={loading || !routingConfig.enableBearerAuth}
                  />
                  <button
                    onClick={saveBearerAuthKey}
                    disabled={loading || !routingConfig.enableBearerAuth}
                    className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50 btn-primary"
                  >
                    {t('common.save')}
                  </button>
                </div>
              </div>
            )}

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

      {/* Change Password */}
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
    </div >
  );
};

export default SettingsPage;