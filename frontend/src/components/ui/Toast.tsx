/**
 * 토스트 알림 컴포넌트
 * 
 * 사용자에게 임시 알림 메시지를 표시하는 토스트 컴포넌트입니다.
 * 자동으로 사라지며, 다양한 타입의 메시지를 지원합니다.
 * 
 * 주요 기능:
 * - 4가지 메시지 타입 (success, error, info, warning)
 * - 자동 사라짐 (커스텀 지속 시간)
 * - 수동 닫기 버튼
 * - 애니메이션 효과
 * - 아이콘 표시
 * - 우상단 고정 위치
 */

import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/utils/cn';

/** 토스트 메시지 타입 */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

/**
 * Toast 컴포넌트의 Props 인터페이스
 */
export interface ToastProps {
  /** 표시할 메시지 */
  message: string;
  /** 메시지 타입 (기본값: 'info') */
  type?: ToastType;
  /** 표시 지속 시간 (ms, 기본값: 3000) */
  duration?: number;
  /** 토스트 닫기 핸들러 */
  onClose: () => void;
  /** 토스트 표시 여부 */
  visible: boolean;
}

/**
 * 토스트 알림 컴포넌트
 * 
 * 사용자에게 임시 알림 메시지를 표시하는 컴포넌트입니다.
 * 지정된 시간 후 자동으로 사라지며, 사용자가 수동으로 닫을 수도 있습니다.
 * 
 * @param {ToastProps} props - 컴포넌트 props
 * @param {string} props.message - 표시할 메시지
 * @param {'success' | 'error' | 'info' | 'warning'} [props.type='info'] - 메시지 타입
 * @param {number} [props.duration=3000] - 표시 지속 시간 (ms)
 * @param {() => void} props.onClose - 토스트 닫기 핸들러
 * @param {boolean} props.visible - 토스트 표시 여부
 * @returns {JSX.Element} 토스트 컴포넌트
 * 
 * @example
 * ```tsx
 * <Toast 
 *   message="저장되었습니다" 
 *   type="success" 
 *   visible={true}
 *   onClose={handleClose}
 * />
 * ```
 */
const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onClose,
  visible
}) => {
  // 자동 사라짐 타이머 설정
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  // 타입별 아이콘 맵핑
  const icons = {
    success: <Check className="w-5 h-5 text-green-500" />,
    error: <X className="w-5 h-5 text-red-500" />,
    info: (
      <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  };

  // 타입별 배경색 맵핑
  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-yellow-50 border-yellow-200'
  };

  // 타입별 텍스트 색상 맵핑
  const textColors = {
    success: 'text-green-800',
    error: 'text-red-800',
    info: 'text-blue-800',
    warning: 'text-yellow-800'
  };

  return (
    <div className={cn(
      "fixed top-4 right-4 z-50 max-w-sm p-4 rounded-md shadow-lg border",
      bgColors[type],
      "transform transition-all duration-300 ease-in-out",
      visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
    )}>
      <div className="flex items-start">
        {/* 아이콘 영역 */}
        <div className="flex-shrink-0">
          {icons[type]}
        </div>
        
        {/* 메시지 영역 */}
        <div className="ml-3">
          <p className={cn("text-sm font-medium", textColors[type])}>
            {message}
          </p>
        </div>
        
        {/* 닫기 버튼 */}
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              onClick={onClose}
              className={cn(
                "inline-flex rounded-md p-1.5",
                `hover:bg-${type}-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${type}-500`
              )}
            >
              <span className="sr-only">Dismiss</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toast;