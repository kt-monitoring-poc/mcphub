import { AlertTriangle, Calendar, Code, Copy, Download, Key, Plus, RefreshCw, Shield, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { getToken } from '../services/authService';

interface MCPHubKey {
  id: string;
  keyValue: string;
  name: string;
  description?: string;
  isActive: boolean;
  expiresAt: string;
  lastUsedAt?: string;
  usageCount: number;
  serviceTokens: string[];
  createdAt: string;
  daysUntilExpiry: number;
  // 관리자 뷰용 사용자 정보
  user?: {
    id: string;
    githubUsername: string;
    displayName?: string;
    isAdmin: boolean;
  };
}

const KeyManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [keys, setKeys] = useState<MCPHubKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingKey, setCreatingKey] = useState(false);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [selectedExpiryDays, setSelectedExpiryDays] = useState(90);
  const [isAdminView, setIsAdminView] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // 키 목록 로드
  const loadKeys = async () => {
    try {
      const token = getToken();
      const response = await fetch('/api/oauth/keys', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token || ''
        }
      });

      if (response.ok) {
        const result = await response.json();
        setKeys(result.data || []);
        setIsAdminView(result.isAdminView || false);
      } else {
        throw new Error('키 목록 로드 실패');
      }
    } catch (error) {
      console.error('키 목록 로드 오류:', error);
      showToast('키 목록을 로드하는 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 새 키 생성 (단순화)
  const handleCreateKey = async () => {
    // 사용자당 키 1개 제한 확인
    if (keys.length > 0) {
      showToast('이미 MCPHub Key가 있습니다. 새 키를 생성하려면 기존 키를 삭제해주세요.', 'error');
      return;
    }

    // 만료일 선택 모달 표시
    setShowExpiryModal(true);
  };

  // 키 생성 실행
  const executeCreateKey = async () => {
    setCreatingKey(true);
    try {
      const token = getToken();
      const response = await fetch('/api/oauth/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token || ''
        },
        body: JSON.stringify({
          expiryDays: selectedExpiryDays
        })
      });

      if (response.ok) {
        const result = await response.json();
        showToast('새 MCPHub Key가 생성되었습니다!', 'success');

        // 생성된 키 값을 클립보드에 복사
        if (result.data?.keyValue) {
          await navigator.clipboard.writeText(result.data.keyValue);
          showToast('키 값이 클립보드에 복사되었습니다.', 'info');
        }

        // 키 목록 새로고침
        await loadKeys();
        setShowExpiryModal(false);
      } else {
        throw new Error('키 생성 실패');
      }
    } catch (error) {
      console.error('키 생성 오류:', error);
      showToast('키 생성 중 오류가 발생했습니다.', 'error');
    } finally {
      setCreatingKey(false);
    }
  };

  // 키 만료일 연장
  const handleExtendKey = async (keyId: string, keyName: string) => {
    if (!confirm(`${keyName}의 만료일을 90일 연장하시겠습니까?`)) {
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`/api/oauth/keys/${keyId}/extend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token || ''
        }
      });

      if (response.ok) {
        showToast('키 만료일이 연장되었습니다!', 'success');
        await loadKeys();
      } else {
        throw new Error('키 연장 실패');
      }
    } catch (error) {
      console.error('키 연장 오류:', error);
      showToast('키 연장 중 오류가 발생했습니다.', 'error');
    }
  };

  // 키 삭제
  const handleDeleteKey = async (keyId: string, keyName: string) => {
    if (!confirm(`${keyName}을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`/api/oauth/keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token || ''
        }
      });

      if (response.ok) {
        showToast('키가 삭제되었습니다.', 'success');
        await loadKeys();
      } else {
        throw new Error('키 삭제 실패');
      }
    } catch (error) {
      console.error('키 삭제 오류:', error);
      showToast('키 삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  // 키 복사
  const handleCopyKey = async (keyId: string) => {
    try {
      const token = getToken();
      const response = await fetch(`/api/oauth/keys/${keyId}/full-value`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token || ''
        }
      });

      if (response.ok) {
        const result = await response.json();
        await navigator.clipboard.writeText(result.data.keyValue);
        showToast('키 값이 클립보드에 복사되었습니다.', 'success');
      } else {
        throw new Error('키 값을 가져올 수 없습니다.');
      }
    } catch (error) {
      console.error('클립보드 복사 오류:', error);
      showToast('클립보드 복사에 실패했습니다.', 'error');
    }
  };

  // 설정 파일 다운로드
  const handleDownloadConfig = () => {
    const key = keys[0]; // 첫 번째 키 사용
    if (!key) return;

    const config = {
      mcpServers: {
        "mcp-hub": {
          "type": "streamable-http",
          "url": "http://localhost:3000/mcp",
          "headers": {
            "Authorization": `Bearer ${key.keyValue}`,
            "Connection": "keep-alive",
            "Content-Type": "application/json"
          }
        }
      }
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mcp.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('설정 파일이 다운로드되었습니다.', 'success');
  };

  // 만료일 색상
  const getExpiryColor = (daysUntilExpiry: number) => {
    if (daysUntilExpiry <= 7) return 'text-red-600 dark:text-red-400';
    if (daysUntilExpiry <= 30) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  useEffect(() => {
    loadKeys();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Key className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isAdminView ? '전체 MCPHub Keys 관리' : 'MCPHub Key 관리'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {isAdminView
                ? '모든 사용자의 MCPHub Key를 관리하세요'
                : 'Cursor IDE에서 사용할 MCPHub Key를 관리하세요'
              }
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {keys.length > 0 && !isAdminView && (
            <button
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Code className="w-4 h-4 mr-2" />
              {showSetupGuide ? '가이드 숨기기' : '설정 가이드'}
            </button>
          )}

          {keys.length === 0 && !isAdminView && (
            <button
              onClick={handleCreateKey}
              disabled={creatingKey}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creatingKey ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  생성 중...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  새 키 생성
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 설정 가이드 (일반 사용자만) */}
      {showSetupGuide && keys.length > 0 && !isAdminView && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Code className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
                Cursor IDE 설정 가이드
              </h3>
              <p className="text-blue-800 dark:text-blue-200 mb-4">
                MCPHub Key를 발급받으셨군요! 이제 Cursor IDE에서 MCPHub를 사용할 수 있도록 설정해주세요.
              </p>

              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">1단계: 설정 파일 위치</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    운영체제에 따라 다음 경로에 <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">mcp.json</code> 파일을 생성하세요:
                  </p>
                  <div className="space-y-1 text-sm">
                    <div><strong className="text-gray-900 dark:text-white">macOS/Linux:</strong> <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-200">~/.cursor/mcp.json</code></div>
                    <div><strong className="text-gray-900 dark:text-white">Windows:</strong> <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-200">%APPDATA%\Cursor\User\mcp.json</code></div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">2단계: 설정 파일 내용</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    아래 설정을 <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">mcp.json</code> 파일에 복사하세요:
                  </p>
                  <div className="relative">
                    <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
                      {`{
  "mcpServers": {
    "mcp-hub": {
      "type": "streamable-http",
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer MCPHub Key를 여기에 복사 붙여넣기",
        "Connection": "keep-alive",
        "Content-Type": "application/json"
      }
    }
  }
}`}
                    </pre>
                    <button
                      onClick={handleDownloadConfig}
                      className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-white"
                      title="설정 파일 다운로드"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      💡 <strong>위의 "MCPHub Key를 여기에 복사 붙여넣기" 부분을 위의 키 값으로 교체하세요.</strong>
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">3단계: Cursor IDE 재시작</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    설정 파일을 저장한 후 Cursor IDE를 완전히 재시작하세요.
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    재시작 후 Cursor IDE에서 MCP 도구들이 정상적으로 표시되는지 확인하세요.
                  </p>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">💡 사용 팁</h4>
                  <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                    <li>• 설정 → API Keys에서 필요한 서비스 키를 입력하세요</li>
                    <li>• 문제가 있으면 Cursor IDE를 완전히 재시작해보세요</li>
                    <li>• MCPHub 서버 연결 문제가 있으면 관리자에게 문의하세요</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 키 목록 */}
      {keys.length === 0 ? (
        <div className="text-center py-12">
          <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">MCPHub Key가 없습니다</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            첫 번째 키를 생성해서 Cursor IDE에서 MCPHub를 사용해보세요.
          </p>

          {/* 키가 없을 때도 간단한 가이드 표시 */}
          <div className="max-w-md mx-auto bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">📋 사용 순서</h4>
            <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>1. MCPHub Key 생성</li>
              <li>2. 설정 → API Keys에서 서비스 키 입력</li>
              <li>3. Cursor IDE에 MCPHub 등록</li>
              <li>4. MCP 도구 사용 시작!</li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {keys.map((key) => (
            <div key={key.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{key.name}</h3>
                    <div className="flex items-center ml-3 space-x-2">
                      {key.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                          <Shield className="w-3 h-3 mr-1" />
                          활성
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                          비활성
                        </span>
                      )}

                      {key.daysUntilExpiry <= 7 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          곧 만료
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 관리자 뷰에서 사용자 정보 표시 */}
                  {isAdminView && key.user && (
                    <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">사용자:</span>
                        <span className="text-sm text-gray-900 dark:text-white font-semibold">
                          {key.user.displayName || key.user.githubUsername}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          (@{key.user.githubUsername})
                        </span>
                        {key.user.isAdmin && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100">
                            관리자
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {key.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-3">{key.description}</p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-300">키 값:</span>
                      <div className="flex items-center mt-1">
                        <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-mono text-gray-800 dark:text-gray-200">
                          {key.keyValue}
                        </code>
                        <button
                          onClick={() => handleCopyKey(key.id)}
                          className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="복사"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500 dark:text-gray-300">만료일:</span>
                      <div className={`flex items-center mt-1 ${getExpiryColor(key.daysUntilExpiry)}`}>
                        <Calendar className="w-4 h-4 mr-1" />
                        <span className="text-gray-900 dark:text-gray-100">{new Date(key.expiresAt).toLocaleDateString()} ({key.daysUntilExpiry}일 남음)</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500 dark:text-gray-300">사용 횟수:</span>
                      <div className="mt-1 text-gray-900 dark:text-gray-100">{key.usageCount.toLocaleString()}회</div>
                    </div>
                  </div>

                  {key.serviceTokens.length > 0 && (
                    <div className="mt-4">
                      <span className="text-gray-500 dark:text-gray-300 text-sm">연결된 서비스:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {key.serviceTokens.map((service) => (
                          <span key={service} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {key.isActive && (
                    <button
                      onClick={() => handleExtendKey(key.id, key.name)}
                      className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                      title="만료일 연장"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteKey(key.id, key.name)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    title="키 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 만료일 선택 모달 */}
      {showExpiryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              키 만료일 선택
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              MCPHub Key의 만료일을 선택해주세요. (1일 ~ 90일)
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                만료일: {selectedExpiryDays}일
              </label>
              <input
                type="range"
                min="1"
                max="90"
                value={selectedExpiryDays}
                onChange={(e) => setSelectedExpiryDays(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>1일</span>
                <span>90일</span>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowExpiryModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                취소
              </button>
              <button
                onClick={executeCreateKey}
                disabled={creatingKey}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingKey ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    생성 중...
                  </>
                ) : (
                  '키 생성'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeyManagementPage; 