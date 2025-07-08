/**
 * 앱 정보 다이얼로그 컴포넌트
 * 
 * 애플리케이션의 버전 정보와 업데이트 확인 기능을 제공하는 모달 다이얼로그입니다.
 * 현재 버전과 최신 버전을 비교하여 업데이트 가능 여부를 알려줍니다.
 * 
 * 주요 기능:
 * - 현재 버전 정보 표시
 * - 최신 버전 확인
 * - 새 버전 알림
 * - GitHub 링크 제공
 * - 수동 업데이트 확인
 * - 로딩 상태 표시
 * - 다크/라이트 테마 지원
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, RefreshCw } from 'lucide-react';
import { checkLatestVersion, compareVersions } from '@/utils/version';

/**
 * AboutDialog 컴포넌트의 Props 인터페이스
 */
interface AboutDialogProps {
  /** 다이얼로그 열림 상태 */
  isOpen: boolean;
  /** 다이얼로그 닫기 핸들러 */
  onClose: () => void;
  /** 현재 애플리케이션 버전 */
  version: string;
}

/**
 * 앱 정보 다이얼로그 컴포넌트
 * 
 * 애플리케이션의 버전 정보를 표시하고 업데이트 확인 기능을 제공합니다.
 * GitHub API를 통해 최신 버전을 확인하고 사용자에게 알려줍니다.
 * 
 * @param {AboutDialogProps} props - 컴포넌트 props
 * @param {boolean} props.isOpen - 다이얼로그 열림 상태
 * @param {() => void} props.onClose - 다이얼로그 닫기 핸들러
 * @param {string} props.version - 현재 애플리케이션 버전
 * @returns {JSX.Element | null} 앱 정보 다이얼로그 또는 null
 */
const AboutDialog: React.FC<AboutDialogProps> = ({ isOpen, onClose, version }) => {
  const { t } = useTranslation();
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const [latestVersion, setLatestVersion] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  /**
   * 업데이트 확인 함수
   * 
   * GitHub API를 통해 최신 버전을 확인하고 현재 버전과 비교합니다.
   * 새 버전이 있으면 사용자에게 알림을 표시합니다.
   */
  const checkForUpdates = async () => {
    setIsChecking(true);
    try {
      const latest = await checkLatestVersion();
      if (latest) {
        setLatestVersion(latest);
        setHasNewVersion(compareVersions(version, latest) > 0);
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // 다이얼로그가 열릴 때 자동으로 업데이트 확인
  useEffect(() => {
    if (isOpen) {
      checkForUpdates();
    }
  }, [isOpen, version]);

  // 다이얼로그가 닫혀있으면 렌더링하지 않음
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-30 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full">
        <div className="p-6 relative">
          {/* 우상단 닫기 버튼 (X) */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>

          {/* 다이얼로그 제목 */}
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            {t('about.title')}
          </h3>

          <div className="space-y-4">
            {/* 현재 버전 정보 */}
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">
                {t('about.currentVersion')}:
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {version}
              </span>
            </div>

            {/* 새 버전 알림 */}
            {hasNewVersion && latestVersion && (
              <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1 text-sm text-blue-700 dark:text-blue-300">
                    <p>{t('about.newVersionAvailable', { version: latestVersion })}</p>
                    <p className="mt-1">
                      <a
                        href="https://github.com/samanhappy/mcphub"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {t('about.viewOnGitHub')}
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 업데이트 확인 버튼 */}
            <button
              onClick={checkForUpdates}
              disabled={isChecking}
              className={`mt-4 inline-flex items-center px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium btn-secondary
                ${isChecking
                  ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800'
                  : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? t('about.checking') : t('about.checkForUpdates')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutDialog;
