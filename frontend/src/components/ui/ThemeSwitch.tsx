/**
 * 테마 스위치 컴포넌트
 * 
 * 라이트/다크 테마를 전환할 수 있는 토글 스위치 컴포넌트입니다.
 * 사용자가 선호하는 테마를 선택할 수 있도록 직관적인 UI를 제공합니다.
 * 
 * 주요 기능:
 * - 라이트/다크 테마 전환
 * - 시각적 피드백 (아이콘 색상 변경)
 * - 접근성 지원 (aria-label, title)
 * - 애니메이션 효과
 * - 다국어 지원
 * - 테마 컨텍스트 연동
 */

import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * 테마 스위치 컴포넌트
 * 
 * 라이트 테마와 다크 테마를 전환할 수 있는 토글 스위치를 제공합니다.
 * 현재 선택된 테마에 따라 시각적 피드백을 제공합니다.
 * 
 * @returns {JSX.Element} 테마 스위치 컴포넌트
 * 
 * @example
 * ```tsx
 * <ThemeSwitch />
 * ```
 */
const ThemeSwitch: React.FC = () => {
  const { t } = useTranslation();
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="flex items-center space-x-2">
      <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        {/* 라이트 테마 버튼 */}
        <button
          onClick={() => setTheme('light')}
          className={`flex items-center justify-center rounded-md p-1.5 ${resolvedTheme === 'light'
            ? 'bg-white text-yellow-600 shadow'
            : 'text-black dark:text-gray-300 hover:text-yellow-600 dark:hover:text-yellow-500'
            }`}
          title={t('theme.light')}
          aria-label={t('theme.light')}
        >
          <Sun size={18} />
        </button>

        {/* 다크 테마 버튼 */}
        <button
          onClick={() => setTheme('dark')}
          className={`flex items-center justify-center rounded-md p-1.5 ${resolvedTheme === 'dark'
            ? 'bg-gray-800 text-blue-400 shadow'
            : 'text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400'
            }`}
          title={t('theme.dark')}
          aria-label={t('theme.dark')}
        >
          <Moon size={18} />
        </button>

        {/* 시스템 테마 버튼 (현재 비활성화) */}
        {/* <button
          onClick={() => setTheme('system')}
          className={`flex items-center justify-center rounded-md p-1.5 ${theme === 'system'
              ? 'bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 shadow'
              : 'text-black dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400'
            }`}
          title={t('theme.system')}
          aria-label={t('theme.system')}
        >
          <Monitor size={18} />
        </button> */}
      </div>
    </div>
  );
};

export default ThemeSwitch;