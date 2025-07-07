/**
 * 후원 다이얼로그 컴포넌트
 * 
 * 프로젝트 후원을 위한 정보를 표시하는 모달 다이얼로그입니다.
 * 언어에 따라 다른 후원 방식을 제공합니다.
 * 
 * 주요 기능:
 * - 언어별 후원 방식 제공
 * - 중국어: 보상 QR 코드 표시
 * - 기타 언어: Ko-fi 후원 링크
 * - 모달 오버레이
 * - 닫기 버튼 (X)
 * - 다크/라이트 테마 지원
 * - 다국어 지원
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

/**
 * SponsorDialog 컴포넌트의 Props 인터페이스
 */
interface SponsorDialogProps {
  /** 다이얼로그 열림 상태 */
  open: boolean;
  /** 다이얼로그 상태 변경 핸들러 */
  onOpenChange: (open: boolean) => void;
}

/**
 * 후원 다이얼로그 컴포넌트
 * 
 * 프로젝트 후원을 위한 정보를 표시하는 모달 다이얼로그입니다.
 * 사용자의 언어 설정에 따라 적절한 후원 방식을 제공합니다.
 * 
 * @param {SponsorDialogProps} props - 컴포넌트 props
 * @param {boolean} props.open - 다이얼로그 열림 상태
 * @param {(open: boolean) => void} props.onOpenChange - 다이얼로그 상태 변경 핸들러
 * @returns {JSX.Element | null} 후원 다이얼로그 또는 null
 */
const SponsorDialog: React.FC<SponsorDialogProps> = ({ open, onOpenChange }) => {
  const { i18n, t } = useTranslation();

  // 다이얼로그가 닫혀있으면 렌더링하지 않음
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full">
        <div className="p-6 relative">
          {/* 우상단 닫기 버튼 (X) */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>

          {/* 다이얼로그 제목 */}
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            {t('sponsor.title')}
          </h3>

          {/* 언어별 후원 방식 표시 */}
          <div className="flex flex-col items-center justify-center py-4">
            {i18n.language === 'zh' ? (
              // 중국어 사용자: 보상 QR 코드 표시
              <img
                src="./assets/reward.png"
                alt={t('sponsor.rewardAlt')}
                className="max-w-full h-auto"
                style={{ maxHeight: '400px' }}
              />
            ) : (
              // 기타 언어: Ko-fi 후원 링크
              <div className="text-center">
                <p className="mb-4 text-gray-700 dark:text-gray-300">{t('sponsor.supportMessage')}</p>
                <a
                  href="https://ko-fi.com/samanhappy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center bg-[#13C3FF] text-white px-4 py-2 rounded-md hover:bg-[#00A5E5] transition-colors"
                >
                  {t('sponsor.supportButton')}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SponsorDialog;
