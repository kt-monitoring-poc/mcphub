/**
 * WeChat 다이얼로그 컴포넌트
 * 
 * WeChat 그룹 참여를 위한 QR 코드를 표시하는 모달 다이얼로그입니다.
 * 중국어 사용자를 위한 소통 채널 제공을 목적으로 합니다.
 * 
 * 주요 기능:
 * - WeChat 그룹 QR 코드 표시
 * - 모달 오버레이
 * - 닫기 버튼 (X)
 * - 다크/라이트 테마 지원
 * - 다국어 지원
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

/**
 * WeChatDialog 컴포넌트의 Props 인터페이스
 */
interface WeChatDialogProps {
  /** 다이얼로그 열림 상태 */
  open: boolean;
  /** 다이얼로그 상태 변경 핸들러 */
  onOpenChange: (open: boolean) => void;
}

/**
 * WeChat 다이얼로그 컴포넌트
 * 
 * WeChat 그룹 참여를 위한 QR 코드를 표시하는 모달 다이얼로그입니다.
 * 사용자가 QR 코드를 스캔하여 WeChat 그룹에 참여할 수 있도록 안내합니다.
 * 
 * @param {WeChatDialogProps} props - 컴포넌트 props
 * @param {boolean} props.open - 다이얼로그 열림 상태
 * @param {(open: boolean) => void} props.onOpenChange - 다이얼로그 상태 변경 핸들러
 * @returns {JSX.Element | null} WeChat 다이얼로그 또는 null
 */
const WeChatDialog: React.FC<WeChatDialogProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();

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
            {t('wechat.title')}
          </h3>

          {/* QR 코드 및 안내 메시지 */}
          <div className="flex flex-col items-center justify-center py-4">
            <img
              src="./assets/wexin.png"
              alt={t('wechat.qrCodeAlt')}
              className="max-w-full h-auto"
              style={{ maxHeight: '400px' }}
            />
            <p className="mt-4 text-center text-gray-700 dark:text-gray-300">
              {t('wechat.scanMessage')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeChatDialog;
