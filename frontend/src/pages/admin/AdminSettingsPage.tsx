import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/contexts/ToastContext';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Settings, 
  Database, 
  Activity, 
  Users,
  Server,
  Save,
  Moon,
  Sun,
  Monitor
} from 'lucide-react';

interface SystemConfig {
  language: string;
  theme: 'light' | 'dark' | 'system';
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  maxUsers: number;
  sessionTimeout: number;
  logRetentionDays: number;
  emailNotifications: boolean;
  systemAlerts: boolean;
}

const AdminSettingsPage: React.FC = () => {
  const { i18n } = useTranslation();
  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();
  
  const [config, setConfig] = useState<SystemConfig>({
    language: i18n.language || 'ko',
    theme: theme || 'system',
    maintenanceMode: false,
    allowNewRegistrations: true,
    maxUsers: 1000,
    sessionTimeout: 24,
    logRetentionDays: 30,
    emailNotifications: true,
    systemAlerts: true
  });
  const [saving, setSaving] = useState(false);

  // 초기 설정 로드
  useEffect(() => {
    setConfig(prev => ({
      ...prev,
      language: i18n.language || 'ko',
      theme: theme || 'system'
    }));
  }, [i18n.language, theme]);

  const handleConfigChange = (key: keyof SystemConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    
    // 즉시 적용되는 설정들
    if (key === 'theme') {
      setTheme(value);
      showToast(`테마가 ${value === 'light' ? '라이트' : value === 'dark' ? '다크' : '시스템'} 모드로 변경되었습니다.`, 'success');
    }
  };

  const handleLanguageChange = (language: string) => {
    handleConfigChange('language', language);
    i18n.changeLanguage(language);
    showToast(`언어가 ${language === 'ko' ? '한국어' : 'English'}로 변경되었습니다.`, 'success');
  };

  const handleToggleChange = (key: keyof SystemConfig, currentValue: boolean) => {
    const newValue = !currentValue;
    handleConfigChange(key, newValue);
    
    const labels: Record<string, string> = {
      maintenanceMode: '유지보수 모드',
      allowNewRegistrations: '새 사용자 등록',
      emailNotifications: '이메일 알림',
      systemAlerts: '시스템 알림'
    };
    
    showToast(`${labels[key] || key}가 ${newValue ? '활성화' : '비활성화'}되었습니다.`, 'success');
  };

  const handleNumberChange = (key: keyof SystemConfig, value: string) => {
    const numValue = parseInt(value) || 0;
    handleConfigChange(key, numValue);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // 실제 API 호출 대신 로컬 저장 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 로컬 스토리지에 설정 저장
      localStorage.setItem('mcphub-admin-config', JSON.stringify(config));
      
      showToast('설정이 성공적으로 저장되었습니다.', 'success');
    } catch (error) {
      showToast('설정 저장에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 저장된 설정 로드
  useEffect(() => {
    const savedConfig = localStorage.getItem('mcphub-admin-config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('저장된 설정 로드 실패:', error);
      }
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">시스템 설정</h1>
          <p className="text-muted-foreground">
            MCPHub 시스템의 전역 설정을 관리합니다.
          </p>
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? '저장 중...' : '설정 저장'}
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 기본 설정 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5" />
            <h3 className="text-lg font-semibold">기본 설정</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">언어 설정</label>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => handleLanguageChange('ko')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    config.language === 'ko'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  한국어
                </button>
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    config.language === 'en'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">테마 설정</label>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => handleConfigChange('theme', 'light')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    config.theme === 'light'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  라이트
                </button>
                <button
                  onClick={() => handleConfigChange('theme', 'dark')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    config.theme === 'dark'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  다크
                </button>
                <button
                  onClick={() => handleConfigChange('theme', 'system')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    config.theme === 'system'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  시스템
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 시스템 상태 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5" />
            <h3 className="text-lg font-semibold">시스템 상태</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">유지보수 모드</span>
              <button
                onClick={() => handleToggleChange('maintenanceMode', config.maintenanceMode)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  config.maintenanceMode
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {config.maintenanceMode ? '활성화' : '비활성화'}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">새 사용자 등록 허용</span>
              <button
                onClick={() => handleToggleChange('allowNewRegistrations', config.allowNewRegistrations)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  config.allowNewRegistrations
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {config.allowNewRegistrations ? '허용' : '차단'}
              </button>
            </div>
          </div>
        </div>

        {/* 사용자 관리 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5" />
            <h3 className="text-lg font-semibold">사용자 관리</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">최대 사용자 수</label>
              <input
                type="number"
                value={config.maxUsers}
                onChange={(e) => handleNumberChange('maxUsers', e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                min="1"
                max="10000"
              />
            </div>

            <div>
              <label className="text-sm font-medium">세션 타임아웃 (시간)</label>
              <input
                type="number"
                value={config.sessionTimeout}
                onChange={(e) => handleNumberChange('sessionTimeout', e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                min="1"
                max="168"
              />
            </div>
          </div>
        </div>

        {/* 로그 및 모니터링 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5" />
            <h3 className="text-lg font-semibold">로그 및 모니터링</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">로그 보관 기간 (일)</label>
              <input
                type="number"
                value={config.logRetentionDays}
                onChange={(e) => handleNumberChange('logRetentionDays', e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                min="1"
                max="365"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">이메일 알림</span>
              <button
                onClick={() => handleToggleChange('emailNotifications', config.emailNotifications)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  config.emailNotifications
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {config.emailNotifications ? '활성화' : '비활성화'}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">시스템 알림</span>
              <button
                onClick={() => handleToggleChange('systemAlerts', config.systemAlerts)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  config.systemAlerts
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {config.systemAlerts ? '활성화' : '비활성화'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 시스템 정보 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-5 h-5" />
          <h3 className="text-lg font-semibold">시스템 정보</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm font-medium dark:bg-gray-700 dark:text-gray-300">버전</span>
            <span className="text-sm">1.0.0</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm font-medium dark:bg-gray-700 dark:text-gray-300">데이터베이스</span>
            <span className="text-sm">PostgreSQL</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm font-medium dark:bg-gray-700 dark:text-gray-300">상태</span>
            <span className="text-sm text-green-600">정상</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage; 