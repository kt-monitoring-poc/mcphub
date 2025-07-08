/**
 * 버튼 컴포넌트
 * 
 * 애플리케이션에서 사용하는 재사용 가능한 버튼 컴포넌트입니다.
 * 다양한 스타일 변형과 크기를 지원하며, 일관된 디자인을 제공합니다.
 * 
 * 주요 기능:
 * - 5가지 스타일 변형 (default, outline, ghost, link, destructive)
 * - 4가지 크기 (default, sm, lg, icon)
 * - 다크/라이트 테마 지원
 * - 비활성화 상태 지원
 * - 접근성 지원
 * - 커스텀 클래스 추가 가능
 */

import React from 'react';
import { cn } from '../../utils/cn';

/** 버튼 스타일 변형 타입 */
type ButtonVariant = 'default' | 'outline' | 'ghost' | 'link' | 'destructive';

/** 버튼 크기 타입 */
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

/**
 * Button 컴포넌트의 Props 인터페이스
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 버튼 스타일 변형 (기본값: 'default') */
  variant?: ButtonVariant;
  /** 버튼 크기 (기본값: 'default') */
  size?: ButtonSize;
  /** 자식 요소로 렌더링할지 여부 */
  asChild?: boolean;
  /** 버튼 내용 */
  children: React.ReactNode;
}

/** 버튼 변형별 스타일 맵핑 */
const variantStyles: Record<ButtonVariant, string> = {
  default: 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500',
  outline: 'border border-gray-300 dark:border-gray-700 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
  ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
  link: 'bg-transparent underline-offset-4 hover:underline text-blue-500 hover:text-blue-600',
  destructive: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
};

/** 버튼 크기별 스타일 맵핑 */
const sizeStyles: Record<ButtonSize, string> = {
  default: 'h-10 py-2 px-4',
  sm: 'h-8 px-3 text-sm',
  lg: 'h-12 px-6',
  icon: 'h-10 w-10 p-0',
};

/**
 * 버튼 컴포넌트
 * 
 * 다양한 스타일과 크기를 지원하는 재사용 가능한 버튼 컴포넌트입니다.
 * 일관된 디자인과 접근성을 제공합니다.
 * 
 * @param {ButtonProps} props - 컴포넌트 props
 * @param {'default' | 'outline' | 'ghost' | 'link' | 'destructive'} [props.variant='default'] - 버튼 스타일 변형
 * @param {'default' | 'sm' | 'lg' | 'icon'} [props.size='default'] - 버튼 크기
 * @param {string} [props.className] - 추가 CSS 클래스
 * @param {boolean} [props.disabled] - 비활성화 상태
 * @param {React.ReactNode} props.children - 버튼 내용
 * @returns {JSX.Element} 버튼 컴포넌트
 * 
 * @example
 * ```tsx
 * <Button variant="default" size="lg">기본 버튼</Button>
 * <Button variant="outline" size="sm">아웃라인 버튼</Button>
 * <Button variant="destructive" disabled>삭제 버튼</Button>
 * ```
 */
export function Button({
  variant = 'default',
  size = 'default',
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-md inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}