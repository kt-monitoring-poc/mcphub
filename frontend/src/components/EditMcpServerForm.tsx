import { Info, Plus, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { Button } from './ui/Button';

interface McpServerEnvVar {
    id: number;
    varName: string;
    displayName: string;
    description?: string;
    required: boolean;
    isSecret: boolean;
    defaultValue?: string;
    validationRegex?: string;
    sortOrder: number;
}

interface McpServer {
    id: number;
    name: string;
    displayName: string;
    description?: string;
    type: 'stdio' | 'streamable-http' | 'sse';
    command?: string;
    args?: string[];
    url?: string;
    headers?: Record<string, string>;
    enabled: boolean;
    groupName?: string;
    sortOrder: number;
    isBuiltIn: boolean;
    environmentVariables: McpServerEnvVar[];
    createdAt: string;
    updatedAt: string;
}

interface EditMcpServerFormProps {
    server: McpServer;
    onClose: () => void;
    onSuccess: () => void;
}

export const EditMcpServerForm: React.FC<EditMcpServerFormProps> = ({
    server,
    onClose,
    onSuccess
}) => {
    const [formData, setFormData] = useState({
        name: server.name,
        displayName: server.displayName,
        description: server.description || '',
        type: server.type,
        command: server.command || '',
        args: server.args || [],
        url: server.url || '',
        headers: server.headers || {},
        groupName: server.groupName || '',
        sortOrder: server.sortOrder,
        isBuiltIn: server.isBuiltIn,
        enabled: server.enabled
    });

    const [envVars, setEnvVars] = useState<Omit<McpServerEnvVar, 'id'>[]>([]);
    const [currentArg, setCurrentArg] = useState('');
    const [currentHeaderKey, setCurrentHeaderKey] = useState('');
    const [currentHeaderValue, setCurrentHeaderValue] = useState('');
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        // 기존 환경변수 데이터 로드 (id 제외)
        if (server.environmentVariables && Array.isArray(server.environmentVariables)) {
            setEnvVars(server.environmentVariables.map(env => ({
                varName: env.varName,
                displayName: env.displayName,
                description: env.description || '',
                required: env.required,
                isSecret: env.isSecret,
                defaultValue: env.defaultValue || '',
                validationRegex: env.validationRegex || '',
                sortOrder: env.sortOrder
            })));
        } else {
            setEnvVars([]);
        }
    }, [server]);

    const addEnvVar = () => {
        const newEnvVar = {
            varName: '',
            displayName: '',
            description: '',
            required: true,
            isSecret: true,
            defaultValue: '',
            validationRegex: '',
            sortOrder: envVars.length
        };
        setEnvVars([...envVars, newEnvVar]);
    };

    const updateEnvVar = (index: number, field: keyof Omit<McpServerEnvVar, 'id'>, value: any) => {
        const updated = [...envVars];
        updated[index] = { ...updated[index], [field]: value };
        setEnvVars(updated);
    };

    const removeEnvVar = (index: number) => {
        setEnvVars(envVars.filter((_, i) => i !== index));
    };

    const addArg = () => {
        if (currentArg.trim()) {
            setFormData({ ...formData, args: [...formData.args, currentArg.trim()] });
            setCurrentArg('');
        }
    };

    const removeArg = (index: number) => {
        setFormData({
            ...formData,
            args: formData.args.filter((_, i) => i !== index)
        });
    };

    const addHeader = () => {
        if (currentHeaderKey.trim() && currentHeaderValue.trim()) {
            setFormData({
                ...formData,
                headers: { ...formData.headers, [currentHeaderKey.trim()]: currentHeaderValue.trim() }
            });
            setCurrentHeaderKey('');
            setCurrentHeaderValue('');
        }
    };

    const removeHeader = (key: string) => {
        const { [key]: removed, ...rest } = formData.headers;
        setFormData({ ...formData, headers: rest });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.displayName || !formData.type) {
            showToast('필수 필드를 모두 입력해주세요.', 'error');
            return;
        }

        if (formData.type === 'stdio' && !formData.command) {
            showToast('stdio 타입은 명령어가 필요합니다.', 'error');
            return;
        }

        if ((formData.type === 'streamable-http' || formData.type === 'sse') && !formData.url) {
            showToast('HTTP/SSE 타입은 URL이 필요합니다.', 'error');
            return;
        }

        setLoading(true);

        try {
            const payload = {
                ...formData,
                environmentVariables: envVars
            };

            const response = await fetch(`/api/mcp/admin/servers/${server.name}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                showToast('MCP 서버가 성공적으로 수정되었습니다.', 'success');
                onSuccess();
            } else {
                const error = await response.json();
                showToast(error.error || '서버 수정에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('Error updating server:', error);
            showToast('서버 수정에 실패했습니다.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        MCP 서버 편집: {server.displayName}
                    </h2>
                    <Button onClick={onClose} variant="ghost" size="sm">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* 기본 정보 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                서버 이름 (ID) *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="예: my-custom-server"
                                disabled={formData.isBuiltIn}
                                required
                            />
                            {formData.isBuiltIn && (
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    내장 서버의 이름은 변경할 수 없습니다.
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                표시 이름 *
                            </label>
                            <input
                                type="text"
                                value={formData.displayName}
                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="예: My Custom Server"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            설명
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            rows={3}
                            placeholder="서버에 대한 설명을 입력하세요..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                서버 타입 *
                            </label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                disabled={formData.isBuiltIn}
                                required
                            >
                                <option value="stdio">Standard I/O (stdio)</option>
                                <option value="streamable-http">Streamable HTTP</option>
                                <option value="sse">Server-Sent Events (SSE)</option>
                            </select>
                            {formData.isBuiltIn && (
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    내장 서버의 타입은 변경할 수 없습니다.
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                그룹
                            </label>
                            <input
                                type="text"
                                value={formData.groupName}
                                onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="예: development, data, testing"
                            />
                        </div>
                    </div>

                    {/* 타입별 설정 - stdio */}
                    {formData.type === 'stdio' && (
                        <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                📟 Standard I/O 설정
                            </h3>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    명령어 *
                                </label>
                                <input
                                    type="text"
                                    value={formData.command}
                                    onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="예: npx, node, python"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    인수 (Arguments)
                                </label>
                                <div className="flex space-x-2 mb-2">
                                    <input
                                        type="text"
                                        value={currentArg}
                                        onChange={(e) => setCurrentArg(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="인수 입력"
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addArg())}
                                    />
                                    <Button type="button" onClick={addArg} variant="outline" size="sm">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.args.map((arg, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                                        >
                                            {arg}
                                            <button
                                                type="button"
                                                onClick={() => removeArg(index)}
                                                className="ml-1 text-gray-500 hover:text-red-500"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 타입별 설정 - HTTP/SSE */}
                    {(formData.type === 'streamable-http' || formData.type === 'sse') && (
                        <div className="space-y-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                {formData.type === 'streamable-http' ? '🌐' : '📡'} {formData.type === 'streamable-http' ? 'Streamable HTTP' : 'SSE'} 설정
                            </h3>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    URL *
                                </label>
                                <input
                                    type="url"
                                    value={formData.url}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="https://example.com/mcp 또는 https://api.example.com/${USER_API_TOKEN}/sse"
                                    required
                                />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    환경변수 치환을 위해 $&#123;변수명&#125; 형식을 사용할 수 있습니다.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    HTTP 헤더
                                </label>
                                <div className="flex space-x-2 mb-2">
                                    <input
                                        type="text"
                                        value={currentHeaderKey}
                                        onChange={(e) => setCurrentHeaderKey(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="헤더명 (예: Authorization)"
                                    />
                                    <input
                                        type="text"
                                        value={currentHeaderValue}
                                        onChange={(e) => setCurrentHeaderValue(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="헤더값 (예: Bearer ${API_TOKEN})"
                                    />
                                    <Button type="button" onClick={addHeader} variant="outline" size="sm">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="space-y-1">
                                    {Object.entries(formData.headers).map(([key, value]) => (
                                        <div key={key} className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm">
                                            <span className="text-gray-900 dark:text-white">
                                                <strong>{key}:</strong> {value}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeHeader(key)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 환경변수 설정 */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                🔑 환경변수 설정
                            </h3>
                            <Button type="button" onClick={addEnvVar} variant="outline" size="sm">
                                <Plus className="w-4 h-4 mr-2" />
                                환경변수 추가
                            </Button>
                        </div>

                        {envVars.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <Info className="w-8 h-8 mx-auto mb-2" />
                                <p>사용자가 입력해야 할 API 키나 설정값이 있다면 환경변수를 추가하세요.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {envVars.map((envVar, index) => (
                                    <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    변수명 *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={envVar.varName}
                                                    onChange={(e) => updateEnvVar(index, 'varName', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                    placeholder="예: JIRA_API_TOKEN"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    표시명 *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={envVar.displayName}
                                                    onChange={(e) => updateEnvVar(index, 'displayName', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                    placeholder="예: Jira API Token"
                                                />
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                설명
                                            </label>
                                            <input
                                                type="text"
                                                value={envVar.description}
                                                onChange={(e) => updateEnvVar(index, 'description', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                placeholder="사용자에게 보여줄 설명"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex space-x-4">
                                                <label className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={envVar.required}
                                                        onChange={(e) => updateEnvVar(index, 'required', e.target.checked)}
                                                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                    />
                                                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">필수</span>
                                                </label>
                                                <label className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={envVar.isSecret}
                                                        onChange={(e) => updateEnvVar(index, 'isSecret', e.target.checked)}
                                                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                    />
                                                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">암호화</span>
                                                </label>
                                            </div>
                                            <Button
                                                type="button"
                                                onClick={() => removeEnvVar(index)}
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 기타 설정 */}
                    <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={formData.enabled}
                                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">서버 활성화</span>
                        </label>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={formData.isBuiltIn}
                                onChange={(e) => setFormData({ ...formData, isBuiltIn: e.target.checked })}
                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                disabled
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">내장 서버로 표시</span>
                        </label>
                    </div>

                    {/* 버튼 */}
                    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <Button type="button" onClick={onClose} variant="outline" disabled={loading}>
                            취소
                        </Button>
                        <Button type="submit" variant="primary" disabled={loading}>
                            {loading ? '수정 중...' : '서버 수정'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}; 