import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';

interface SchedulerStatus {
    isRunning: boolean;
    config: {
        enabled: boolean;
        intervalHours: number;
        autoCleanup: boolean;
        maxOrphanedKeys: number;
        scheduledTime?: string;
    } | null;
    nextRunTime: string | null;
}

interface ValidationResult {
    isValid: boolean;
    issues: Array<{
        type: string;
        severity: 'ERROR' | 'WARNING' | 'INFO';
        message: string;
    }>;
    summary: {
        totalServers: number;
        totalEnvVars: number;
        totalUsers: number;
        usersWithTokens: number;
        orphanedKeys: string[];
        missingKeys: string[];
    };
}

interface CleanupResult {
    success: boolean;
    message: string;
    data: {
        affectedUsers: number;
        removedVars: string[];
        dryRun: boolean;
    };
}

const EnvVarManagementPage: React.FC = () => {
    const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // 스케줄러 설정 상태
    const [schedulerConfig, setSchedulerConfig] = useState({
        enabled: false,
        intervalHours: 24,
        autoCleanup: false,
        maxOrphanedKeys: 10,
        scheduledTime: "00:00"
    });

    // 페이지 로드시 데이터 가져오기
    useEffect(() => {
        fetchSchedulerStatus();
        fetchValidationResult();
    }, []);

    // 스케줄러 상태 조회
    const fetchSchedulerStatus = async () => {
        try {
            const response = await fetch('/api/admin/env-scheduler/status', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();

            if (data.success) {
                setSchedulerStatus(data.data);
                if (data.data.config) {
                    setSchedulerConfig(data.data.config);
                }
            }
        } catch (error) {
            console.error('스케줄러 상태 조회 실패:', error);
        }
    };

    // 환경변수 검증 결과 조회
    const fetchValidationResult = async () => {
        try {
            const response = await fetch('/api/env-vars/validate', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();

            if (data.success) {
                setValidationResult(data.data);
            }
        } catch (error) {
            console.error('검증 결과 조회 실패:', error);
        }
    };

    // 스케줄러 설정 업데이트
    const updateSchedulerConfig = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/env-scheduler/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(schedulerConfig)
            });

            const data = await response.json();

            if (data.success) {
                setToast({ message: '스케줄러 설정이 업데이트되었습니다.', type: 'success' });
                await fetchSchedulerStatus();
            } else {
                setToast({ message: data.message || '설정 업데이트에 실패했습니다.', type: 'error' });
            }
        } catch (error) {
            setToast({ message: '설정 업데이트 중 오류가 발생했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // 수동 검증 실행
    const runManualValidation = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/env-scheduler/run', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();

            if (data.success) {
                setToast({ message: '환경변수 검증이 실행되었습니다.', type: 'success' });
                await fetchValidationResult();
            } else {
                setToast({ message: data.message || '검증 실행에 실패했습니다.', type: 'error' });
            }
        } catch (error) {
            setToast({ message: '검증 실행 중 오류가 발생했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // 환경변수 정리 (시뮬레이션)
    const cleanupEnvVars = async (dryRun: boolean = true) => {
        try {
            setLoading(true);
            const response = await fetch('/api/env-vars/cleanup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ dryRun })
            });

            const data: CleanupResult = await response.json();

            if (data.success) {
                const message = dryRun
                    ? `시뮬레이션 완료: ${data.data.affectedUsers}명의 사용자에서 ${data.data.removedVars.length}개 키 정리 가능`
                    : `정리 완료: ${data.data.affectedUsers}명의 사용자에서 ${data.data.removedVars.length}개 키 제거됨`;
                setToast({ message, type: 'success' });
                await fetchValidationResult();
            } else {
                setToast({ message: data.message || '정리에 실패했습니다.', type: 'error' });
            }
        } catch (error) {
            setToast({ message: '정리 중 오류가 발생했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">환경변수 관리</h1>
                <Button
                    onClick={fetchValidationResult}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    새로고침
                </Button>
            </div>

            {/* 현재 상태 요약 */}
            {validationResult && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-2">MCP 서버</h3>
                        <p className="text-2xl font-bold text-blue-600">{validationResult.summary.totalServers}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-2">환경변수</h3>
                        <p className="text-2xl font-bold text-green-600">{validationResult.summary.totalEnvVars}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-2">총 사용자</h3>
                        <p className="text-2xl font-bold text-purple-600">{validationResult.summary.totalUsers}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-2">고아 키</h3>
                        <p className="text-2xl font-bold text-red-600">{validationResult.summary.orphanedKeys.length}</p>
                    </div>
                </div>
            )}

            {/* 스케줄러 설정 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">자동 관리 스케줄러</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                id="enabled"
                                checked={schedulerConfig.enabled}
                                onChange={(e) => setSchedulerConfig({ ...schedulerConfig, enabled: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded"
                            />
                            <label htmlFor="enabled" className="text-sm font-medium">스케줄러 활성화</label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">실행 방식</label>
                            <select
                                value={schedulerConfig.scheduledTime ? "scheduled" : "interval"}
                                onChange={(e) => {
                                    if (e.target.value === "scheduled") {
                                        setSchedulerConfig({ ...schedulerConfig, scheduledTime: "00:00" });
                                    } else {
                                        setSchedulerConfig({ ...schedulerConfig, scheduledTime: undefined });
                                    }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                            >
                                <option value="scheduled">특정 시간에 실행</option>
                                <option value="interval">주기적 실행</option>
                            </select>

                            {schedulerConfig.scheduledTime ? (
                                <div>
                                    <label className="block text-sm font-medium mb-1">실행 시간</label>
                                    <input
                                        type="time"
                                        value={schedulerConfig.scheduledTime}
                                        onChange={(e) => setSchedulerConfig({ ...schedulerConfig, scheduledTime: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">매일 지정된 시간에 실행됩니다</p>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium mb-1">검증 주기 (시간)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="168"
                                        value={schedulerConfig.intervalHours}
                                        onChange={(e) => setSchedulerConfig({ ...schedulerConfig, intervalHours: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">서버 시작 후 주기적으로 실행됩니다</p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                id="autoCleanup"
                                checked={schedulerConfig.autoCleanup}
                                onChange={(e) => setSchedulerConfig({ ...schedulerConfig, autoCleanup: e.target.checked })}
                                className="w-4 h-4 text-red-600 rounded"
                            />
                            <label htmlFor="autoCleanup" className="text-sm font-medium text-red-600">
                                자동 정리 활성화 (위험)
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">알림 임계값 (고아 키 개수)</label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={schedulerConfig.maxOrphanedKeys}
                                onChange={(e) => setSchedulerConfig({ ...schedulerConfig, maxOrphanedKeys: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                            <h3 className="font-medium mb-2">현재 상태</h3>
                            <p className="text-sm">
                                실행 중: <span className={schedulerStatus?.isRunning ? 'text-green-600' : 'text-red-600'}>
                                    {schedulerStatus?.isRunning ? '예' : '아니오'}
                                </span>
                            </p>
                            {schedulerStatus?.config?.scheduledTime && (
                                <p className="text-sm mt-1">
                                    실행 방식: 매일 {schedulerStatus.config.scheduledTime}
                                </p>
                            )}
                            {schedulerStatus?.nextRunTime && (
                                <p className="text-sm mt-1">
                                    다음 실행: {new Date(schedulerStatus.nextRunTime).toLocaleString()}
                                </p>
                            )}
                        </div>

                        <Button
                            onClick={updateSchedulerConfig}
                            disabled={loading}
                            className="w-full bg-green-600 hover:bg-green-700"
                        >
                            설정 저장
                        </Button>
                    </div>
                </div>
            </div>

            {/* 수동 작업 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">수동 관리</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button
                        onClick={runManualValidation}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        검증 실행
                    </Button>

                    <Button
                        onClick={() => cleanupEnvVars(true)}
                        disabled={loading}
                        className="bg-yellow-600 hover:bg-yellow-700"
                    >
                        정리 시뮬레이션
                    </Button>

                    <Button
                        onClick={() => cleanupEnvVars(false)}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        실제 정리 실행
                    </Button>
                </div>
            </div>

            {/* 검증 결과 */}
            {validationResult && validationResult.issues.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4">검증 결과</h2>

                    <div className="space-y-2">
                        {validationResult.issues.map((issue, index) => (
                            <div
                                key={index}
                                className={`p-3 rounded-md ${issue.severity === 'ERROR' ? 'bg-red-100 text-red-800' :
                                    issue.severity === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-blue-100 text-blue-800'
                                    }`}
                            >
                                <span className="font-medium">[{issue.severity}]</span> {issue.message}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Toast 알림 */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

export default EnvVarManagementPage;