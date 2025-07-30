import ChangePasswordForm from '@/components/ChangePasswordForm';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Eye, EyeOff, FileText, Github, Globe, Key, MessageSquare, Save, Server, Settings } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

// 환경변수 설정 인터페이스
interface EnvVarConfig {
  varName: string;
  serverName: string;
  displayName: string;
  description: string;
  required: boolean;
  icon: React.ReactNode;
}

// MCP 서버 정보 인터페이스
interface McpServerInfo {
  name: string;
  displayName?: string;
  description?: string;
  enabled: boolean;
}

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  // 환경변수 관련 상태
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [envVarConfigs, setEnvVarConfigs] = useState<EnvVarConfig[]>([]);
  const [mcpServers, setMcpServers] = useState<McpServerInfo[]>([]);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [savingEnvVars, setSavingEnvVars] = useState(false);
  const [loading, setLoading] = useState(true);

  // Update current language when it changes
  useEffect(() => {
    setCurrentLanguage(i18n.language);
  }, [i18n.language]);

  // 환경변수 템플릿 및 서버 정보 로드
  useEffect(() => {
    loadEnvVarTemplates();
  }, []);

  // 환경변수 템플릿 로드
  const loadEnvVarTemplates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('mcphub_token');

      // 1. 환경변수 템플릿 조회
      const envTemplatesResponse = await fetch('/api/env-templates', {
        headers: {
          'x-auth-token': token || '',
        },
      });

      if (envTemplatesResponse.ok) {
        const envTemplatesData = await envTemplatesResponse.json();
        const templates = envTemplatesData.data;

        // 2. MCP 서버 정보 조회
        const serversResponse = await fetch('/api/servers', {
          headers: {
            'x-auth-token': token || '',
          },
        });

        if (serversResponse.ok) {
          const serversData = await serversResponse.json();
          const servers = serversData.data;
          setMcpServers(servers);

          // 3. 환경변수 설정 생성
          const configs: EnvVarConfig[] = [];
          const initialEnvVars: Record<string, string> = {};
          const initialShowPasswords: Record<string, boolean> = {};

          Object.entries(templates).forEach(([serverName, envVars]) => {
            const server = servers.find((s: McpServerInfo) => s.name === serverName);

            (envVars as string[]).forEach((envVar) => {
              const config: EnvVarConfig = {
                varName: envVar,
                serverName: serverName,
                displayName: getEnvVarDisplayName(envVar),
                description: getEnvVarDescription(envVar, server),
                required: true,
                icon: getEnvVarIcon(envVar)
              };

              configs.push(config);
              initialEnvVars[envVar] = '';
              initialShowPasswords[envVar] = false;
            });
          });

          setEnvVarConfigs(configs);
          setEnvVars(initialEnvVars);
          setShowPasswords(initialShowPasswords);

          // 4. 기존 사용자 환경변수 로드
          await loadUserEnvVars();
        } else {
          console.error('서버 정보 로드 실패');
        }
      } else {
        console.error('환경변수 템플릿 로드 실패');
      }
    } catch (error) {
      console.error('환경변수 설정 로드 중 오류 발생:', error);
      showToast('환경변수 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 사용자 환경변수 로드
  const loadUserEnvVars = async () => {
    try {
      const token = localStorage.getItem('mcphub_token');

      const response = await fetch('/api/user-env-vars', {
        headers: {
          'x-auth-token': token || '',
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.data && typeof data.data === 'object') {
          // API 응답 데이터를 envVars 구조로 변환
          const flattenedEnvVars: Record<string, string> = {};

          Object.entries(data.data).forEach(([serverName, serverEnvVars]) => {
            if (typeof serverEnvVars === 'object' && serverEnvVars !== null) {
              Object.entries(serverEnvVars as Record<string, string>).forEach(([varName, value]) => {
                // USER_ 접두사를 추가하여 템플릿과 매칭
                const userVarName = varName.startsWith('USER_') ? varName : `USER_${varName}`;
                flattenedEnvVars[userVarName] = value;
              });
            }
          });

          setEnvVars(prev => ({ ...prev, ...flattenedEnvVars }));
        }
      } else {
        console.error('사용자 환경변수 로드 실패');
      }
    } catch (error) {
      console.error('사용자 환경변수 로드 중 오류 발생:', error);
    }
  };

  // 환경변수 저장
  const handleSaveEnvVars = async () => {
    try {
      setSavingEnvVars(true);
      const token = localStorage.getItem('mcphub_token');

      // envVars를 서버별로 그룹화하고 USER_ 접두사 제거
      const groupedEnvVarsForSave: Record<string, Record<string, string>> = {};

      Object.entries(envVars).forEach(([varName, value]) => {
        if (value && value.trim() !== '') {
          // USER_ 접두사 제거
          const cleanVarName = varName.startsWith('USER_') ? varName.substring(5) : varName;

          // envVarConfigs에서 동적으로 서버 찾기 (완전 자동화)
          const config = envVarConfigs.find(c => c.varName === varName);
          if (config) {
            const serverName = config.serverName;
            if (!groupedEnvVarsForSave[serverName]) {
              groupedEnvVarsForSave[serverName] = {};
            }
            groupedEnvVarsForSave[serverName][cleanVarName] = value;
          }
        }
      });

      const response = await fetch('/api/user-env-vars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify({
          envVars: groupedEnvVarsForSave
        }),
      });

      if (response.ok) {
        showToast('환경변수가 성공적으로 저장되었습니다.', 'success');
      } else {
        const data = await response.json();
        showToast(data.message || '환경변수 저장에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('환경변수 저장 실패:', error);
      showToast('환경변수 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setSavingEnvVars(false);
    }
  };

  // 환경변수 표시명 생성
  const getEnvVarDisplayName = (envVar: string): string => {
    const varName = envVar.replace('USER_', '');
    return varName.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  // 환경변수 설명 생성
  const getEnvVarDescription = (envVar: string, server?: McpServerInfo): string => {
    const serverName = server?.displayName || server?.name || '알 수 없는 서버';
    const varName = envVar.replace('USER_', '');

    const descriptions: Record<string, string> = {
      'FIRECRAWL_TOKEN': '웹 스크래핑 및 검색 기능에 필요',
      'GITHUB_TOKEN': 'GitHub API 접근에 필요',
      'CONFLUENCE_TOKEN': 'Confluence 문서 및 페이지 관리에 필요',
      'JIRA_TOKEN': 'Jira 이슈 및 프로젝트 관리에 필요',
      'JIRA_BASE_URL': 'Jira 인스턴스 URL (예: https://your-domain.atlassian.net)',
      'JIRA_EMAIL': 'Jira 계정 이메일 주소',
    };

    return descriptions[varName] || `${serverName} 서버 연결에 필요`;
  };

  // 환경변수 아이콘 생성
  const getEnvVarIcon = (envVar: string): React.ReactNode => {
    const varName = envVar.replace('USER_', '');

    const icons: Record<string, React.ReactNode> = {
      'FIRECRAWL_TOKEN': <Globe className="w-4 h-4" />,
      'GITHUB_TOKEN': <Github className="w-4 h-4" />,
      'CONFLUENCE_TOKEN': <FileText className="w-4 h-4" />,
      'JIRA_TOKEN': <MessageSquare className="w-4 h-4" />,
      'JIRA_BASE_URL': <Server className="w-4 h-4" />,
      'JIRA_EMAIL': <MessageSquare className="w-4 h-4" />,
    };

    return icons[varName] || <Key className="w-4 h-4" />;
  };

  // 비밀번호 표시 토글
  const togglePasswordVisibility = (envVar: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [envVar]: !prev[envVar]
    }));
  };

  // 환경변수 그룹별로 정리
  const groupedEnvVars = envVarConfigs.reduce((groups, config) => {
    const serverName = config.serverName;
    if (!groups[serverName]) {
      groups[serverName] = [];
    }
    groups[serverName].push(config);
    return groups;
  }, {} as Record<string, EnvVarConfig[]>);

  // 섹션 토글 상태
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // 언어 변경
  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          설정
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          MCP 서버 연결을 위한 환경변수 및 시스템 설정을 관리합니다.
        </p>
      </div>

      {/* 환경변수 설정 섹션 */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <Key className="w-5 h-5 mr-2" />
            MCP 서버 환경변수 설정
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            각 MCP 서버에 연결하기 위해 필요한 API 키와 설정값을 입력하세요.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {Object.keys(groupedEnvVars).length === 0 ? (
            <div className="text-center py-8">
              <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                설정할 환경변수가 없습니다
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                관리자가 MCP 서버를 추가하면 여기에 필요한 환경변수가 표시됩니다.
              </p>
            </div>
          ) : (
            <>
              {Object.entries(groupedEnvVars).map(([serverName, configs]) => {
                const server = mcpServers.find(s => s.name === serverName);
                const isOpen = openSections[serverName] !== false; // 기본값 true

                return (
                  <div key={serverName} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                    <button
                      onClick={() => toggleSection(serverName)}
                      className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center">
                        <Server className="w-5 h-5 mr-3 text-blue-600 dark:text-blue-400" />
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {server?.displayName || serverName}
                          </h3>
                          {server?.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {server.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {configs.length}개 환경변수
                        </span>
                        <div className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                          ▼
                        </div>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 space-y-4">
                        {configs.map((config) => (
                          <div key={config.varName} className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              <div className="flex items-center">
                                {config.icon}
                                <span className="ml-2">{config.displayName}</span>
                                {config.required && (
                                  <span className="ml-1 text-red-500">*</span>
                                )}
                              </div>
                            </label>
                            <div className="relative">
                              <input
                                type={showPasswords[config.varName] ? 'text' : 'password'}
                                value={envVars[config.varName] || ''}
                                onChange={(e) => setEnvVars(prev => ({
                                  ...prev,
                                  [config.varName]: e.target.value
                                }))}
                                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder={`${config.displayName} 입력`}
                              />
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(config.varName)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              >
                                {showPasswords[config.varName] ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {config.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 저장 버튼 */}
              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleSaveEnvVars}
                  disabled={savingEnvVars}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {savingEnvVars ? '저장 중...' : '환경변수 저장'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 언어 설정 */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            언어 설정
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                언어 선택
              </label>
              <select
                value={currentLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="ko">한국어</option>
                <option value="en">English</option>
                <option value="zh">中文</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 비밀번호 변경 */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            비밀번호 변경
          </h2>
        </div>
        <div className="p-6">
          <ChangePasswordForm onSuccess={() => { }} />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;