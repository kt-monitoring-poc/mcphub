import { Edit3, FileText, Server, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { EditMcpServerForm } from '../../components/EditMcpServerForm';
import { SettingsFileEditor } from '../../components/SettingsFileEditor';
import { Button } from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DeleteDialog from '../../components/ui/DeleteDialog';
import { useToast } from '../../contexts/ToastContext';

// mcp_settings.json 기반 서버 정보 인터페이스
interface ServerInfo {
    name: string;
    status: 'connected' | 'disconnected';
    error: string | null;
    tools: Array<{
        name: string;
        description: string;
        inputSchema: any;
        enabled: boolean;
    }>;
    createTime: number;
    enabled: boolean;
}

export const McpServersPage: React.FC = () => {
    const [servers, setServers] = useState<ServerInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSettingsEditor, setShowSettingsEditor] = useState(false);
    const [editingServer, setEditingServer] = useState<ServerInfo | null>(null);
    const [deletingServer, setDeletingServer] = useState<ServerInfo | null>(null);
    const [toggleConfirm, setToggleConfirm] = useState<ServerInfo | null>(null);
    const { showToast } = useToast();

    const fetchServers = async () => {
        try {
            const token = localStorage.getItem('mcphub_token');
            // mcp_settings.json 기반 API 사용
            const response = await fetch('/api/servers', {
                headers: {
                    'x-auth-token': token || '',
                },
            });
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

    const handleToggleServer = async (server: ServerInfo) => {
        try {
            // mcp_settings.json 기반 API 사용
            const response = await fetch(`/api/servers/${server.name}/toggle`, {
                method: 'POST',
                headers: {
                    'x-auth-token': localStorage.getItem('mcphub_token') || '',
                }
            });

            if (response.ok) {
                const data = await response.json();
                showToast(data.message || '서버 상태가 변경되었습니다.', 'success');
                fetchServers();
            } else {
                const data = await response.json();
                showToast(data.message || '서버 상태 변경에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('Error toggling server:', error);
            showToast('서버 상태 변경에 실패했습니다.', 'error');
        }
        setToggleConfirm(null);
    };

    const handleDeleteServer = async (server: ServerInfo) => {
        try {
            // mcp_settings.json 기반 API 사용
            const response = await fetch(`/api/servers/${server.name}`, {
                method: 'DELETE',
                headers: {
                    'x-auth-token': localStorage.getItem('mcphub_token') || '',
                }
            });

            if (response.ok) {
                showToast('서버가 성공적으로 삭제되었습니다.', 'success');
                fetchServers();
            } else {
                const data = await response.json();
                showToast(data.message || '서버 삭제에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('Error deleting server:', error);
            showToast('서버 삭제에 실패했습니다.', 'error');
        }
        setDeletingServer(null);
    };

    const getTypeIcon = (server: ServerInfo) => {
        // 서버 상태에 따른 아이콘 반환
        if (server.status === 'connected') {
            return '🟢';
        } else if (server.enabled) {
            return '🟡';
        } else {
            return '🔴';
        }
    };

    const getStatusLabel = (server: ServerInfo) => {
        if (server.status === 'connected') {
            return '연결됨';
        } else if (server.enabled) {
            return '연결 중';
        } else {
            return '비활성화';
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
                        MCP 서버 상태 모니터링 및 관리
                    </p>
                </div>
                <Button
                    onClick={() => setShowSettingsEditor(true)}
                    variant="primary"
                    className="flex items-center space-x-2"
                >
                    <FileText className="w-4 h-4" />
                    <span>설정 파일 편집</span>
                </Button>
            </div>

            <div className="grid gap-6">
                {servers.length === 0 ? (
                    <div className="text-center py-12">
                        <Server className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">서버가 없습니다</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            새 서버를 추가하여 시작하세요.
                        </p>
                    </div>
                ) : (
                    servers.map((server) => (
                        <div
                            key={server.name}
                            className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="text-2xl">{getTypeIcon(server)}</div>
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                            {server.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            상태: {getStatusLabel(server)}
                                            {server.tools.length > 0 && ` • ${server.tools.length}개 도구`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        onClick={() => setToggleConfirm(server)}
                                        variant={server.enabled ? "secondary" : "primary"}
                                        size="sm"
                                        className="flex items-center space-x-1"
                                    >
                                        {server.enabled ? (
                                            <>
                                                <ToggleLeft className="w-4 h-4" />
                                                <span>비활성화</span>
                                            </>
                                        ) : (
                                            <>
                                                <ToggleRight className="w-4 h-4" />
                                                <span>활성화</span>
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        onClick={() => setEditingServer(server)}
                                        variant="secondary"
                                        size="sm"
                                        className="flex items-center space-x-1"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                        <span>편집</span>
                                    </Button>
                                    <Button
                                        onClick={() => setDeletingServer(server)}
                                        variant="danger"
                                        size="sm"
                                        className="flex items-center space-x-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span>삭제</span>
                                    </Button>
                                </div>
                            </div>

                            {server.tools.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                        도구 목록
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {server.tools.map((tool) => (
                                            <div
                                                key={tool.name}
                                                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                                            >
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {tool.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {tool.description}
                                                    </p>
                                                </div>
                                                <div className={`px-2 py-1 rounded text-xs ${tool.enabled
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                    }`}>
                                                    {tool.enabled ? '활성' : '비활성'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {server.error && (
                                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                                    <p className="text-sm text-red-800 dark:text-red-200">
                                        오류: {server.error}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* 서버 추가 폼 */}
            {/* Removed AddMcpServerForm */}

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
                    message={`${toggleConfirm.name} 서버를 ${toggleConfirm.enabled ? '비활성화' : '활성화'}하시겠습니까?`}
                    confirmText={toggleConfirm.enabled ? '비활성화' : '활성화'}
                    onConfirm={() => handleToggleServer(toggleConfirm)}
                    onCancel={() => setToggleConfirm(null)}
                />
            )}

            {/* 삭제 확인 다이얼로그 */}
            {deletingServer && (
                <DeleteDialog
                    title="서버 삭제"
                    message={`${deletingServer.name} 서버를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
                    onConfirm={() => handleDeleteServer(deletingServer)}
                    onCancel={() => setDeletingServer(null)}
                />
            )}

            {/* 설정 파일 편집기 */}
            {showSettingsEditor && (
                <SettingsFileEditor
                    onClose={() => {
                        setShowSettingsEditor(false);
                        fetchServers(); // 설정 변경 후 서버 목록 새로고침
                    }}
                />
            )}
        </div>
    );
}; 