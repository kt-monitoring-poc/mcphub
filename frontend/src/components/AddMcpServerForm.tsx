import { Info, X } from 'lucide-react';
import React, { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { Button } from './ui/Button';

interface AddMcpServerFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

export const AddMcpServerForm: React.FC<AddMcpServerFormProps> = ({ onClose, onSuccess }) => {
    const [serverName, setServerName] = useState('');
    const [jsonConfig, setJsonConfig] = useState(`{
  "type": "streamable-http",
  "url": "https://api.example.com/mcp",
  "enabled": false,
  "headers": {
    "Authorization": "Bearer \${USER_API_TOKEN}",
    "Content-Type": "application/json"
  }
}`);
    const [detectedEnvVars, setDetectedEnvVars] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [jsonError, setJsonError] = useState('');
    const { showToast } = useToast();

    // JSON에서 환경변수 템플릿 감지
    const detectEnvVars = (jsonStr: string) => {
        try {
            const config = JSON.parse(jsonStr);
            const envVars: string[] = [];

            const detectInObject = (obj: any) => {
                if (typeof obj === 'string') {
                    const matches = obj.match(/\$\{([^}]+)\}/g);
                    if (matches) {
                        matches.forEach(match => {
                            const varName = match.slice(2, -1); // ${VAR_NAME} -> VAR_NAME
                            if (varName.startsWith('USER_') && !envVars.includes(varName)) {
                                envVars.push(varName);
                            }
                        });
                    }
                } else if (Array.isArray(obj)) {
                    obj.forEach(item => detectInObject(item));
                } else if (obj && typeof obj === 'object') {
                    Object.values(obj).forEach(value => detectInObject(value));
                }
            };

            detectInObject(config);
            setDetectedEnvVars(envVars);
            setJsonError('');
        } catch (error) {
            setJsonError('JSON 형식이 올바르지 않습니다.');
            setDetectedEnvVars([]);
        }
    };

    // JSON 변경 시 환경변수 자동 감지
    const handleJsonChange = (value: string) => {
        setJsonConfig(value);
        detectEnvVars(value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!serverName.trim()) {
            showToast('서버 이름을 입력해주세요.', 'error');
            return;
        }

        if (jsonError) {
            showToast('JSON 형식을 수정해주세요.', 'error');
            return;
        }

        setLoading(true);
        try {
            const config = JSON.parse(jsonConfig);

            const response = await fetch('/api/servers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': localStorage.getItem('mcphub_token') || '',
                },
                body: JSON.stringify({
                    name: serverName.trim(),
                    config: config
                }),
            });

            const data = await response.json();

            if (response.ok) {
                showToast('서버가 성공적으로 추가되었습니다.', 'success');
                onSuccess();
            } else {
                showToast(data.message || '서버 추가에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('Error adding server:', error);
            showToast('서버 추가 중 오류가 발생했습니다.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        새 MCP 서버 추가
                    </h2>
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 서버 이름 입력 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            서버 이름 *
                        </label>
                        <input
                            type="text"
                            value={serverName}
                            onChange={(e) => setServerName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="예: jira, confluence, custom-server"
                            required
                        />
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            서버를 식별하는 고유한 이름을 입력하세요.
                        </p>
                    </div>

                    {/* JSON 설정 에디터 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            서버 설정 (JSON) *
                        </label>
                        <div className="relative">
                            <textarea
                                value={jsonConfig}
                                onChange={(e) => handleJsonChange(e.target.value)}
                                className={`w-full h-64 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm ${jsonError
                                        ? 'border-red-300 dark:border-red-600'
                                        : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                placeholder="MCP 서버 설정을 JSON 형식으로 입력하세요..."
                                required
                            />
                            {jsonError && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                    {jsonError}
                                </p>
                            )}
                        </div>

                        {/* JSON 예시 */}
                        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                <strong>JSON 설정 예시:</strong>
                            </p>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                <div>• Streamable HTTP: {"{"}"type": "streamable-http", "url": "...", "headers": {"{"}"Authorization": "Bearer $&#123;USER_TOKEN&#125;"{"}"}{"}"}</div>
                                <div>• SSE: {"{"}"type": "sse", "url": "...", "enabled": false{"}"}</div>
                                <div>• 환경변수: $&#123;USER_API_KEY&#125; 형식으로 사용하면 자동으로 사용자 입력 필드가 생성됩니다.</div>
                            </div>
                        </div>
                    </div>

                    {/* 감지된 환경변수 표시 */}
                    {detectedEnvVars.length > 0 && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                            <div className="flex items-center mb-2">
                                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" />
                                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                    감지된 환경변수
                                </h4>
                            </div>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                                다음 환경변수들이 일반 사용자의 설정 페이지에 자동으로 생성됩니다:
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {detectedEnvVars.map((envVar, index) => (
                                    <span
                                        key={index}
                                        className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded"
                                    >
                                        {envVar}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 버튼 */}
                    <div className="flex justify-end space-x-3">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="secondary"
                        >
                            취소
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={loading || !!jsonError}
                        >
                            {loading ? '추가 중...' : '서버 추가'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}; 