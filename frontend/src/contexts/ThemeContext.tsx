import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

// 테마 타입 정의: 사용자가 선택할 수 있는 테마 옵션들
type Theme = 'light' | 'dark' | 'system';

/**
 * ThemeContext의 타입 정의
 * Context에서 제공할 값들의 구조를 정의합니다
 */
interface ThemeContextType {
  theme: Theme;                    // 현재 선택된 테마 (light/dark/system)
  setTheme: (theme: Theme) => void; // 테마를 변경하는 함수
  resolvedTheme: 'light' | 'dark'; // 실제 적용된 테마 (system 선택 시 OS 설정에 따라 결정)
}

// React Context 생성
// createContext는 전역에서 사용할 수 있는 상태 저장소를 만듭니다
// undefined로 초기화하여 나중에 Provider로 값을 제공할 예정
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * useTheme 훅: ThemeContext에서 테마 관련 값들을 가져오는 커스텀 훅
 * 
 * 이 훅을 사용하면 어떤 컴포넌트에서든 테마 정보에 접근할 수 있습니다.
 * 예시: const { theme, setTheme, resolvedTheme } = useTheme();
 */
export const useTheme = () => {
  // useContext를 사용하여 ThemeContext에서 값을 가져옵니다
  const context = useContext(ThemeContext);
  
  // Context가 Provider로 감싸지지 않은 경우 에러를 발생시킵니다
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

/**
 * ThemeProvider 컴포넌트: 테마 관리 기능을 제공하는 Context Provider
 * 
 * 이 컴포넌트는 애플리케이션의 최상위에서 모든 하위 컴포넌트들에게
 * 테마 관련 기능을 제공합니다.
 * 
 * @param children - ThemeProvider로 감싸진 하위 컴포넌트들
 */
export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 테마 상태 관리
  // useState의 초기값으로 함수를 전달하여 localStorage에서 저장된 테마를 가져옵니다
  // 저장된 테마가 없으면 'system'을 기본값으로 사용합니다
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    return savedTheme || 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  /**
   * 테마를 변경하고 localStorage에 저장하는 함수
   * @param newTheme - 새로운 테마 설정
   */
  const handleSetTheme = (newTheme: Theme) => {
    console.log('🔄 Theme change requested:', newTheme);
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    console.log('💾 Theme saved to localStorage:', newTheme);
  };

  /**
   * 시스템 테마 변경을 처리하고 문서에 테마를 적용하는 useEffect
   * 
   * useEffect는 컴포넌트가 렌더링된 후 실행되는 부수 효과를 처리합니다.
   * 의존성 배열 [theme]에 theme이 포함되어 있어서, theme이 변경될 때마다 실행됩니다.
   */
  useEffect(() => {
    /**
     * 테마를 업데이트하는 내부 함수
     * OS의 테마 설정을 확인하고 실제 적용할 테마를 결정합니다
     */
    const updateTheme = () => {
      // HTML 루트 요소에 접근 (테마 클래스를 추가/제거할 대상)
      const root = window.document.documentElement;
      
      // OS의 다크 모드 설정을 확인
      // matchMedia는 CSS 미디어 쿼리를 JavaScript에서 확인하는 방법입니다
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

      // Determine which theme to use
      const themeToApply = theme === 'system' ? systemTheme : theme;
      console.log('🎨 Theme resolution:', { theme, systemTheme, themeToApply });
      setResolvedTheme(themeToApply as 'light' | 'dark');

      // Apply or remove dark class based on theme
      if (themeToApply === 'dark') {
        console.log('🌙 Applying dark mode to HTML root element');
        root.classList.add('dark');
        console.log('✅ Dark class added. Current classes:', root.className);
        // Force remove any light mode styles
        document.body.style.backgroundColor = '';
        document.body.style.color = '';
      } else {
        console.log('☀️ Removing dark mode from HTML root element');
        root.classList.remove('dark');
        console.log('✅ Dark class removed. Current classes:', root.className);
        // Force remove any dark mode styles
        document.body.style.backgroundColor = '';
        document.body.style.color = '';
        // Force light mode styles
        document.body.style.backgroundColor = '#f9fafb';
        document.body.style.color = '#111827';
      }
    };

    // OS 테마 변경을 감지하는 이벤트 리스너 설정
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateTheme);

    // Initial theme setup
    updateTheme();

    // 클린업 함수: 컴포넌트가 언마운트될 때 이벤트 리스너 제거
    // 메모리 누수를 방지하기 위해 필요합니다
    return () => {
      mediaQuery.removeEventListener('change', updateTheme);
    };
  }, [theme]); // theme이 변경될 때마다 실행

  // Context Provider로 하위 컴포넌트들에게 테마 관련 값들을 제공
  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};