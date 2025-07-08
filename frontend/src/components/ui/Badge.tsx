/**
 * 배지 컴포넌트
 * 
 * 상태나 카테고리를 나타내는 작은 라벨 컴포넌트입니다.
 * 다양한 스타일 변형을 지원하며, 클릭 이벤트도 처리할 수 있습니다.
 * 
 * 주요 기능:
 * - 4가지 스타일 변형 (default, secondary, outline, destructive)
 * - 클릭 이벤트 지원
 * - 다크/라이트 테마 지원
 * - 상태 배지 (StatusBadge) 포함
 * - 커스텀 클래스 추가 가능
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';

/** 배지 스타일 변형 타입 */
type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive';

/**
 * Badge 컴포넌트의 Props 인터페이스
 */
type BadgeProps = {
  /** 배지 내용 */
  children: React.ReactNode;
  /** 배지 스타일 변형 (기본값: 'default') */
  variant?: BadgeVariant;
  /** 추가 CSS 클래스 */
  className?: string;
  /** 클릭 이벤트 핸들러 */
  onClick?: () => void;
};

/** 배지 변형별 스타일 맵핑 */
const badgeVariants = {
  default: 'bg-blue-500 text-white hover:bg-blue-600',
  secondary: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
  outline: 'bg-transparent border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
  destructive: 'bg-red-500 text-white hover:bg-red-600',
};

/**
 * 배지 컴포넌트
 * 
 * 상태나 카테고리를 나타내는 작은 라벨을 렌더링합니다.
 * 다양한 스타일과 클릭 이벤트를 지원합니다.
 * 
 * @param {BadgeProps} props - 컴포넌트 props
 * @param {React.ReactNode} props.children - 배지 내용
 * @param {'default' | 'secondary' | 'outline' | 'destructive'} [props.variant='default'] - 배지 스타일 변형
 * @param {string} [props.className] - 추가 CSS 클래스
 * @param {() => void} [props.onClick] - 클릭 이벤트 핸들러
 * @returns {JSX.Element} 배지 컴포넌트
 * 
 * @example
 * ```tsx
 * <Badge variant="default">새로운</Badge>
 * <Badge variant="destructive" onClick={handleDelete}>삭제</Badge>
 * ```
 */
export function Badge({
  children,
  variant = 'default',
  className,
  onClick
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        badgeVariants[variant],
        onClick ? 'cursor-pointer' : '',
        className
      )}
      onClick={onClick}
    >
      {children}
    </span>
  );
}

/**
 * 상태 배지 컴포넌트
 * 
 * 연결 상태를 나타내는 특수한 배지 컴포넌트입니다.
 * 기존 코드와의 호환성을 위해 제공됩니다.
 * 
 * @param {Object} props - 컴포넌트 props
 * @param {'connected' | 'disconnected' | 'connecting'} props.status - 연결 상태
 * @returns {JSX.Element} 상태 배지 컴포넌트
 * 
 * @example
 * ```tsx
 * <StatusBadge status="connected" />
 * <StatusBadge status="disconnected" />
 * ```
 */
export const StatusBadge = ({ status }: { status: 'connected' | 'disconnected' | 'connecting' }) => {
  const { t } = useTranslation();

  // 상태별 CSS 클래스 맵핑
  const colors = {
    connecting: 'status-badge-connecting',
    connected: 'status-badge-online',
    disconnected: 'status-badge-offline',
  };

  // 상태별 번역 키 맵핑
  const statusTranslations = {
    connected: 'status.online',
    disconnected: 'status.offline',
    connecting: 'status.connecting'
  };

  return (
    <span
      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status]}`}
    >
      {t(statusTranslations[status] || status)}
    </span>
  );
};