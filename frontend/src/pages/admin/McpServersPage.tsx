import { Edit3, Plus, Server, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { AddMcpServerForm } from '../../components/AddMcpServerForm';
import { EditMcpServerForm } from '../../components/EditMcpServerForm';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DeleteDialog } from '../../components/ui/DeleteDialog';
import { useToast } from '../../contexts/ToastContext';

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

export const McpServersPage: React.FC = () => {
    const [servers, setServers] = useState<McpServer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingServer, setEditingServer] = useState<McpServer | null>(null);
    const [deletingServer, setDeletingServer] = useState<McpServer | null>(null);
    const [toggleConfirm, setToggleConfirm] = useState<McpServer | null>(null);
    const { showToast } = useToast();

    const fetchServers = async () => {
        try {
            const response = await fetch('/api/mcp/admin/servers');
            if (response.ok) {
                const data = await response.json();
                setServers(data.data);
            } else {
                showToast('서버 목록을 불러오는데 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('Error fetching servers:', error);
            showToast('서버 목록을 불러오는데 실패했습니다.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServers();
    }, []);

    const handleToggleServer = async (server: McpServer) => {
        try {
            const response = await fetch(`/api/mcp/admin/servers/${server.name}/toggle`, {
                method: 'PATCH'
            });

            if (response.ok) {
                const data = await response.json();
                showToast(data.message, 'success');
                fetchServers();
            } else {
                const data = await response.json();
                showToast(data.error || '서버 상태 변경에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('Error toggling server:', error);
            showToast('서버 상태 변경에 실패했습니다.', 'error');
        }
        setToggleConfirm(null);
    };

    const handleDeleteServer = async (server: McpServer) => {
        try {
            const response = await fetch(`/api/mcp/admin/servers/${server.name}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showToast('서버가 성공적으로 삭제되었습니다.', 'success');
                fetchServers();
            } else {
                const data = await response.json();
                showToast(data.error || '서버 삭제에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('Error deleting server:', error);
            showToast('서버 삭제에 실패했습니다.', 'error');
        }
        setDeletingServer(null);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'stdio':
                return '📟';
            case 'streamable-http':
                return '🌐';
            case 'sse':
                return '📡';
            default:
                return '❓';
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'stdio':
                return 'Standard I/O';
            case 'streamable-http':
                return 'Streamable HTTP';
            case 'sse':
                return 'Server-Sent Events';
            default:
                return type;
        }
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        MCP 서버 관리
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        동적 MCP 서버 추가, 수정, 삭제 및 환경변수 관리
                    </p>
                </div>
                <Button
                    onClick={() => setShowAddForm(true)}
                    variant="primary"
                    className="flex items-center space-x-2"
                >
                    <Plus className="w-4 h-4" />
                    <span>새 서버 추가</span>
                </Button>
            </div>

            <div className="grid gap-6">
                {servers.length === 0 ? (
                    <div className="text-center py-12">
                        <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            등록된 MCP 서버가 없습니다
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            새로운 MCP 서버를 추가해보세요.
                        </p>
                        <Button
                            onClick={() => setShowAddForm(true)}
                            variant="primary"
                            className="flex items-center space-x-2 mx-auto"
                        >
                            <Plus className="w-4 h-4" />
                            <span>첫 번째 서버 추가</span>
                        </Button>
                    </div>
                ) : (
                    servers.map((server) => (
                        <div
                            key={server.id}
                            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <span className="text-2xl">{getTypeIcon(server.type)}</span>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {server.displayName}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {server.name} • {getTypeLabel(server.type)}
                                            </p>
                                        </div>
                                        {server.isBuiltIn && (
                                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                                                내장
                                            </span>
                                        )}
                                        {server.enabled ? (
                                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                                                활성화
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 rounded">
                                                비활성화
                                            </span>
                                        )}
                                    </div>

                                    {server.description && (
                                        <p className="text-gray-600 dark:text-gray-400 mb-3">
                                            {server.description}
                                        </p>
                                    )}

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        {server.type === 'stdio' && (
                                            <>
                                                <div>
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">명령어:</span>
                                                    <span className="ml-2 text-gray-600 dark:text-gray-400">
                                                        {server.command} {server.args?.join(' ')}
                                                    </span>
                                                </div>
                                            </>
                                        )}

                                        {(server.type === 'streamable-http' || server.type === 'sse') && (
                                            <div>
                                                <span className="font-medium text-gray-700 dark:text-gray-300">URL:</span>
                                                <span className="ml-2 text-gray-600 dark:text-gray-400">
                                                    {server.url}
                                                </span>
                                            </div>
                                        )}

                                        {server.groupName && (
                                            <div>
                                                <span className="font-medium text-gray-700 dark:text-gray-300">그룹:</span>
                                                <span className="ml-2 text-gray-600 dark:text-gray-400">
                                                    {server.groupName}
                                                </span>
                                            </div>
                                        )}

                                        <div>
                                            <span className="font-medium text-gray-700 dark:text-gray-300">환경변수:</span>
                                            <span className="ml-2 text-gray-600 dark:text-gray-400">
                                                {server.environmentVariables.length}개
                                            </span>
                                        </div>
                                    </div>

                                    {server.environmentVariables.length > 0 && (
                                        <div className="mt-4">
                                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                필요한 환경변수:
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {server.environmentVariables
                                                    .sort((a, b) => a.sortOrder - b.sortOrder)
                                                    .map((envVar) => (
                                                        <span
                                                            key={envVar.id}
                                                            className={`px-2 py-1 text-xs rounded ${envVar.required
                                                                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                                                }`}
                                                            title={envVar.description}
                                                        >
                                                            {envVar.displayName}
                                                            {envVar.required && ' *'}
                                                            {envVar.isSecret && ' 🔒'}
                                                        </span>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center space-x-2 ml-4">
                                    <Button
                                        onClick={() => setToggleConfirm(server)}
                                        variant="ghost"
                                        size="sm"
                                        className="flex items-center space-x-1"
                                        title={server.enabled ? '비활성화' : '활성화'}
                                    >
                                        {server.enabled ? (
                                            <ToggleRight className="w-4 h-4 text-green-600" />
                                        ) : (
                                            <ToggleLeft className="w-4 h-4 text-gray-400" />
                                        )}
                                    </Button>

                                    <Button
                                        onClick={() => setEditingServer(server)}
                                        variant="ghost"
                                        size="sm"
                                        title="편집"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </Button>

                                    {!server.isBuiltIn && (
                                        <Button
                                            onClick={() => setDeletingServer(server)}
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700"
                                            title="삭제"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* 서버 추가 폼 */}
            {showAddForm && (
                <AddMcpServerForm
                    onClose={() => setShowAddForm(false)}
                    onSuccess={() => {
                        setShowAddForm(false);
                        fetchServers();
                    }}
                />
            )}

            {/* 서버 편집 폼 */}
            {editingServer && (
                <EditMcpServerForm
                    server={editingServer}
                    onClose={() => setEditingServer(null)}
                    onSuccess={() => {
                        setEditingServer(null);
                        fetchServers();
                    }}
                />
            )}

            {/* 토글 확인 다이얼로그 */}
            {toggleConfirm && (
                <ConfirmDialog
                    title={`서버 ${toggleConfirm.enabled ? '비활성화' : '활성화'}`}
                    message={`${toggleConfirm.displayName} 서버를 ${toggleConfirm.enabled ? '비활성화' : '활성화'
                        }하시겠습니까?`}
                    confirmText={toggleConfirm.enabled ? '비활성화' : '활성화'}
                    onConfirm={() => handleToggleServer(toggleConfirm)}
                    onCancel={() => setToggleConfirm(null)}
                />
            )}

            {/* 삭제 확인 다이얼로그 */}
            {deletingServer && (
                <DeleteDialog
                    title="서버 삭제"
                    message={`${deletingServer.displayName} 서버를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
                    onConfirm={() => handleDeleteServer(deletingServer)}
                    onCancel={() => setDeletingServer(null)}
                />
            )}
        </div>
    );
}; 