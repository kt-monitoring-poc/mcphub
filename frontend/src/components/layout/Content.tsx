/**
 * 메인 콘텐츠 레이아웃 컴포넌트
 * 
 * 애플리케이션의 메인 콘텐츠 영역을 감싸는 레이아웃 컴포넌트입니다.
 * 반응형 컨테이너와 스크롤 가능한 영역을 제공합니다.
 * 
 * 주요 기능:
 * - 메인 콘텐츠 영역 래핑
 * - 반응형 컨테이너 제공
 * - 다크/라이트 테마 지원
 * - 스크롤 가능한 영역 설정
 */

import React, { ReactNode } from 'react';

/**
 * Content 컴포넌트의 Props 인터페이스
 */
interface ContentProps {
  /** 렌더링할 자식 요소들 */
  children: ReactNode;
}

/**
 * 메인 콘텐츠 레이아웃 컴포넌트
 * 
 * 페이지의 메인 콘텐츠를 감싸고 적절한 레이아웃과 스타일을 제공합니다.
 * 
 * @param {ContentProps} props - 컴포넌트 props
 * @param {ReactNode} props.children - 렌더링할 자식 요소들
 * @returns {JSX.Element} 메인 콘텐츠 레이아웃
 */
const Content: React.FC<ContentProps> = ({ children }) => {
  return (
    <main className="flex-1 overflow-auto p-6 bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto">
        {children}
      </div>
    </main>
  );
};

export default Content;