import { AlertTriangle, CheckCircle, RefreshCw, Save, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { Button } from './ui/Button';

interface SettingsFileEditorProps {
    onClose: () => void;
}

interface McpSettings {
    mcpServers: Record<string, any>;
    users: Array<{
        username: string;
        password: string;
        isAdmin: boolean;
    }>;
}

export const SettingsFileEditor: React.FC<SettingsFileEditorProps> = ({ onClose }) => {
    const [settings, setSettings] = useState<McpSettings | null>(null);
    const [jsonContent, setJsonContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [jsonError, setJsonError] = useState('');
    const [hasChanges, setHasChanges] = useState(false);
    const { showToast } = useToast();

    // 설정 파일 로드
    const loadSettingsFile = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/settings-file', {
                headers: {
                    'x-auth-token': localStorage.getItem('mcphub_token') || ''
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load settings file');
            }

            const result = await response.json();
            if (result.success) {
                setSettings(result.data);
                setJsonContent(JSON.stringify(result.data, null, 2));
                setJsonError('');
            } else {
                throw new Error(result.message || 'Failed to load settings');
            }
        } catch (error) {
            console.error('Error loading settings file:', error);
            showToast('설정 파일 로드 실패', 'error');
        } finally {
            setLoading(false);
        }
    };

    // 설정 파일 저장
    const saveSettingsFile = async () => {
        try {
            setSaving(true);
            setJsonError('');

            // JSON 파싱 검증
            let parsedSettings: McpSettings;
            try {
                parsedSettings = JSON.parse(jsonContent);
            } catch (error) {
                setJsonError('잘못된 JSON 형식입니다.');
                return;
            }

            // 필수 필드 검증
            if (!parsedSettings.mcpServers || typeof parsedSettings.mcpServers !== 'object') {
                setJsonError('mcpServers 객체가 필요합니다.');
                return;
            }

            if (!parsedSettings.users || !Array.isArray(parsedSettings.users)) {
                setJsonError('users 배열이 필요합니다.');
                return;
            }

            // API 호출
            const response = await fetch('/api/admin/settings-file', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': localStorage.getItem('mcphub_token') || ''
                },
                body: JSON.stringify({ settings: parsedSettings })
            });

            if (!response.ok) {
                throw new Error('Failed to save settings file');
            }

            const result = await response.json();
            if (result.success) {
                setSettings(parsedSettings);
                setHasChanges(false);
                showToast('설정 파일이 성공적으로 저장되었습니다.', 'success');
            } else {
                throw new Error(result.message || 'Failed to save settings');
            }
        } catch (error) {
            console.error('Error saving settings file:', error);
            showToast('설정 파일 저장 실패', 'error');
        } finally {
            setSaving(false);
        }
    };

    // JSON 내용 변경 감지
    const handleJsonChange = (value: string) => {
        setJsonContent(value);
        setHasChanges(true);
        setJsonError('');

        // 실시간 JSON 유효성 검사
        try {
            JSON.parse(value);
        } catch (error) {
            setJsonError('잘못된 JSON 형식입니다.');
        }
    };

    // 초기 로드
    useEffect(() => {
        loadSettingsFile();
    }, []);

    // 저장 전 확인
    const handleSave = () => {
        if (jsonError) {
            showToast('JSON 오류를 수정해주세요.', 'error');
            return;
        }
        saveSettingsFile();
    };

    // 변경사항이 있을 때 저장 확인
    const handleClose = () => {
        if (hasChanges) {
            if (confirm('저장하지 않은 변경사항이 있습니다. 정말로 나가시겠습니까?')) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
                    <div className="flex items-center space-x-3">
                        <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                        <span className="text-gray-700 dark:text-gray-300">설정 파일 로드 중...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            mcp_settings.json 편집
                        </h2>
                        {hasChanges && (
                            <div className="flex items-center space-x-1 text-orange-600 dark:text-orange-400">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-sm">변경사항 있음</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            onClick={loadSettingsFile}
                            variant="secondary"
                            size="sm"
                            disabled={saving}
                        >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            새로고침
                        </Button>
                        <Button
                            onClick={handleSave}
                            variant="primary"
                            size="sm"
                            disabled={saving || !!jsonError || !hasChanges}
                        >
                            <Save className="w-4 h-4 mr-1" />
                            {saving ? '저장 중...' : '저장'}
                        </Button>
                        <Button onClick={handleClose} variant="ghost" size="sm">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* 파일 정보 */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                    파일 정보
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    MCP 서버: {settings?.mcpServers ? Object.keys(settings.mcpServers).length : 0}개
                                    | 사용자: {settings?.users ? settings.users.length : 0}명
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                {!jsonError && (
                                    <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                                        <CheckCircle className="w-4 h-4" />
                                        <span className="text-sm">유효한 JSON</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* JSON 에디터 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            mcp_settings.json 내용
                        </label>
                        <div className="relative">
                            <textarea
                                value={jsonContent}
                                onChange={(e) => handleJsonChange(e.target.value)}
                                className={`w-full h-96 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm ${jsonError ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                placeholder="mcp_settings.json 내용을 입력하세요..."
                            />
                            {jsonError && (
                                <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                                    <div className="flex items-center">
                                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mr-2" />
                                        <span className="text-sm text-red-600 dark:text-red-400">{jsonError}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 도움말 */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                            편집 가이드
                        </h4>
                        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                            <p>• <strong>mcpServers</strong>: MCP 서버 설정 객체 (필수)</p>
                            <p>• <strong>users</strong>: 사용자 정보 배열 (필수)</p>
                            <p>• <strong>환경변수</strong>: ${`{USER_VAR_NAME}`} 형식으로 사용하면 자동으로 사용자 입력 필드가 생성됩니다</p>
                            <p>• <strong>JSON 형식</strong>: 올바른 JSON 형식을 유지해야 합니다</p>
                            <p>• <strong>저장</strong>: 변경사항을 저장하면 즉시 반영됩니다</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}; 