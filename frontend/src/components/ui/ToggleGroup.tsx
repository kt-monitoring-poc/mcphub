/**
 * 토글 그룹 컴포넌트
 * 
 * 다중 선택이 가능한 토글 그룹과 관련 UI 컴포넌트들을 제공합니다.
 * 체크박스 형태의 다중 선택과 스위치 형태의 단일 토글을 지원합니다.
 * 
 * 포함된 컴포넌트:
 * - ToggleGroupItem: 개별 토글 아이템
 * - ToggleGroup: 다중 선택 토글 그룹
 * - Switch: 단일 토글 스위치
 */

import React, { ReactNode } from 'react';
import { cn } from '@/utils/cn';

/**
 * ToggleGroupItem 컴포넌트의 Props 인터페이스
 */
interface ToggleGroupItemProps {
  /** 아이템의 값 */
  value: string;
  /** 선택 상태 */
  isSelected: boolean;
  /** 클릭 핸들러 */
  onClick: () => void;
  /** 아이템 내용 */
  children: ReactNode;
}

/**
 * 토글 그룹 아이템 컴포넌트
 * 
 * 토글 그룹 내의 개별 선택 가능한 아이템을 렌더링합니다.
 * 선택 상태에 따라 시각적 피드백을 제공합니다.
 * 
 * @param {ToggleGroupItemProps} props - 컴포넌트 props
 * @param {string} props.value - 아이템의 값
 * @param {boolean} props.isSelected - 선택 상태
 * @param {() => void} props.onClick - 클릭 핸들러
 * @param {ReactNode} props.children - 아이템 내용
 * @returns {JSX.Element} 토글 그룹 아이템
 */
export const ToggleGroupItem: React.FC<ToggleGroupItemProps> = ({
  isSelected,
  onClick,
  children
}) => {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isSelected}
      className={cn(
        "flex w-full items-center justify-between p-2 rounded transition-colors cursor-pointer",
        isSelected
          ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border-l-4 border-blue-500"
          : "hover:bg-gray-50 text-gray-700"
      )}
      onClick={onClick}
    >
      <span className="flex items-center">
        {children}
      </span>
      {/* 선택 상태 표시 아이콘 */}
      {isSelected && (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-blue-500">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
};

/**
 * ToggleGroup 컴포넌트의 Props 인터페이스
 */
interface ToggleGroupProps {
  /** 그룹 라벨 */
  label: string;
  /** 도움말 텍스트 */
  helpText?: string;
  /** 옵션이 없을 때 표시할 텍스트 */
  noOptionsText?: string;
  /** 선택된 값들의 배열 */
  values: string[];
  /** 선택 가능한 옵션들 */
  options: { value: string; label: string }[];
  /** 값 변경 핸들러 */
  onChange: (values: string[]) => void;
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * 토글 그룹 컴포넌트
 * 
 * 다중 선택이 가능한 토글 그룹을 렌더링합니다.
 * 사용자가 여러 옵션을 선택하거나 해제할 수 있습니다.
 * 
 * @param {ToggleGroupProps} props - 컴포넌트 props
 * @param {string} props.label - 그룹 라벨
 * @param {string} [props.helpText] - 도움말 텍스트
 * @param {string} [props.noOptionsText="No options available"] - 옵션이 없을 때 표시할 텍스트
 * @param {string[]} props.values - 선택된 값들의 배열
 * @param {Array<{value: string, label: string}>} props.options - 선택 가능한 옵션들
 * @param {(values: string[]) => void} props.onChange - 값 변경 핸들러
 * @param {string} [props.className] - 추가 CSS 클래스
 * @returns {JSX.Element} 토글 그룹 컴포넌트
 * 
 * @example
 * ```tsx
 * <ToggleGroup
 *   label="기능 선택"
 *   values={selectedFeatures}
 *   options={[
 *     { value: 'feature1', label: '기능 1' },
 *     { value: 'feature2', label: '기능 2' }
 *   ]}
 *   onChange={setSelectedFeatures}
 * />
 * ```
 */
export const ToggleGroup: React.FC<ToggleGroupProps> = ({
  label,
  helpText,
  noOptionsText = "No options available",
  values,
  options,
  onChange,
  className
}) => {
  /**
   * 개별 아이템 토글 핸들러
   * 
   * @param {string} value - 토글할 값
   */
  const handleToggle = (value: string) => {
    const isSelected = values.includes(value);
    if (isSelected) {
      onChange(values.filter(v => v !== value));
    } else {
      onChange([...values, value]);
    }
  };

  return (
    <div className={className}>
      {/* 그룹 라벨 */}
      <label className="block text-gray-700 text-sm font-bold mb-2">
        {label}
      </label>
      
      {/* 옵션 목록 */}
      <div className="border border-gray-200 rounded shadow max-h-60 overflow-y-auto">
        {options.length === 0 ? (
          <p className="text-gray-500 text-sm p-3">{noOptionsText}</p>
        ) : (
          <div className="space-y-1 p-1">
            {options.map(option => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                isSelected={values.includes(option.value)}
                onClick={() => handleToggle(option.value)}
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </div>
        )}
      </div>
      
      {/* 도움말 텍스트 */}
      {helpText && (
        <p className="text-xs text-gray-500 mt-1">
          {helpText}
        </p>
      )}
    </div>
  );
};

/**
 * Switch 컴포넌트의 Props 인터페이스
 */
interface SwitchProps {
  /** 체크 상태 */
  checked: boolean;
  /** 체크 상태 변경 핸들러 */
  onCheckedChange: (checked: boolean) => void;
  /** 비활성화 상태 */
  disabled?: boolean;
}

/**
 * 스위치 컴포넌트
 * 
 * 단일 토글 상태를 제어하는 스위치 컴포넌트입니다.
 * iOS 스타일의 토글 스위치를 구현합니다.
 * 
 * @param {SwitchProps} props - 컴포넌트 props
 * @param {boolean} props.checked - 체크 상태
 * @param {(checked: boolean) => void} props.onCheckedChange - 체크 상태 변경 핸들러
 * @param {boolean} [props.disabled=false] - 비활성화 상태
 * @returns {JSX.Element} 스위치 컴포넌트
 * 
 * @example
 * ```tsx
 * <Switch 
 *   checked={isEnabled}
 *   onCheckedChange={setIsEnabled}
 *   disabled={false}
 * />
 * ```
 */
export const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  disabled = false
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500",
        checked ? "bg-blue-200" : "bg-gray-100",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      )}
      onClick={() => !disabled && onCheckedChange(!checked)}
    >
      {/* 스위치 핸들 */}
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
};