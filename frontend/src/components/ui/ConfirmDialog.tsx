/**
 * 확인 다이얼로그 컴포넌트
 * 
 * 사용자에게 중요한 작업의 확인을 요청하는 모달 다이얼로그입니다.
 * 다양한 변형(위험, 경고, 정보)과 커스터마이징 옵션을 제공합니다.
 * 
 * 주요 기능:
 * - 3가지 변형 (danger, warning, info)
 * - 커스텀 제목/메시지/버튼 텍스트
 * - 키보드 지원 (Escape, Enter)
 * - 배경 클릭으로 닫기
 * - 접근성 지원 (ARIA)
 * - 애니메이션 효과
 * - 아이콘 표시
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * ConfirmDialog 컴포넌트의 Props 인터페이스
 */
interface ConfirmDialogProps {
  /** 다이얼로그 열림 상태 */
  isOpen: boolean;
  /** 다이얼로그 닫기 핸들러 */
  onClose: () => void;
  /** 확인 핸들러 */
  onConfirm: () => void;
  /** 다이얼로그 제목 (선택적) */
  title?: string;
  /** 확인 메시지 */
  message: string;
  /** 확인 버튼 텍스트 (선택적) */
  confirmText?: string;
  /** 취소 버튼 텍스트 (선택적) */
  cancelText?: string;
  /** 다이얼로그 변형 (기본값: 'warning') */
  variant?: 'danger' | 'warning' | 'info';
}

/**
 * 확인 다이얼로그 컴포넌트
 * 
 * 사용자에게 중요한 작업의 확인을 요청하는 모달 다이얼로그입니다.
 * 변형에 따라 적절한 아이콘과 색상을 표시합니다.
 * 
 * @param {ConfirmDialogProps} props - 컴포넌트 props
 * @param {boolean} props.isOpen - 다이얼로그 열림 상태
 * @param {() => void} props.onClose - 다이얼로그 닫기 핸들러
 * @param {() => void} props.onConfirm - 확인 핸들러
 * @param {string} [props.title] - 다이얼로그 제목
 * @param {string} props.message - 확인 메시지
 * @param {string} [props.confirmText] - 확인 버튼 텍스트
 * @param {string} [props.cancelText] - 취소 버튼 텍스트
 * @param {'danger' | 'warning' | 'info'} [props.variant='warning'] - 다이얼로그 변형
 * @returns {JSX.Element | null} 확인 다이얼로그 또는 null
 * 
 * @example
 * ```tsx
 * <ConfirmDialog
 *   isOpen={showConfirm}
 *   onClose={() => setShowConfirm(false)}
 *   onConfirm={handleDelete}
 *   title="삭제 확인"
 *   message="정말로 삭제하시겠습니까?"
 *   variant="danger"
 * />
 * ```
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'warning'
}) => {
  const { t } = useTranslation();

  // 다이얼로그가 닫혀있으면 렌더링하지 않음
  if (!isOpen) return null;

  /**
   * 변형별 스타일을 반환하는 함수
   * 
   * @returns {Object} 아이콘과 확인 버튼 클래스를 포함한 스타일 객체
   */
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: (
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ),
          confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
        };
      case 'warning':
        return {
          icon: (
            <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ),
          confirmClass: 'bg-yellow-600 hover:bg-yellow-700 text-white',
        };
      case 'info':
        return {
          icon: (
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          confirmClass: 'bg-blue-600 hover:bg-blue-700 text-white',
        };
      default:
        return {
          icon: null,
          confirmClass: 'bg-blue-600 hover:bg-blue-700 text-white',
        };
    }
  };

  const { icon, confirmClass } = getVariantStyles();

  /**
   * 배경 클릭 핸들러
   * 
   * @param {React.MouseEvent} e - 마우스 클릭 이벤트
   */
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  /**
   * 키보드 이벤트 핸들러
   * 
   * @param {React.KeyboardEvent} e - 키보드 이벤트
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      onConfirm();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all duration-200 ease-out"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div className="p-6">
          {/* 아이콘과 메시지 영역 */}
          <div className="flex items-start space-x-3">
            {/* 변형별 아이콘 */}
            {icon && (
              <div className="flex-shrink-0">
                {icon}
              </div>
            )}
            
            {/* 제목과 메시지 */}
            <div className="flex-1">
              {title && (
                <h3
                  id="confirm-dialog-title"
                  className="text-lg font-medium text-gray-900 mb-2"
                >
                  {title}
                </h3>
              )}
              <p
                id="confirm-dialog-message"
                className="text-gray-600 leading-relaxed"
              >
                {message}
              </p>
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex justify-end space-x-3 mt-6">
            {/* 취소 버튼 */}
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-150 btn-secondary"
              autoFocus
            >
              {cancelText || t('common.cancel')}
            </button>
            
            {/* 확인 버튼 */}
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmClass} ${variant === 'danger' ? 'btn-danger' : variant === 'warning' ? 'btn-warning' : 'btn-primary'}`}
            >
              {confirmText || t('common.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
