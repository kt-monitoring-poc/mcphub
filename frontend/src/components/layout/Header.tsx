// React 라이브러리와 useState 훅을 가져옵니다
// useState: 컴포넌트 내에서 상태를 관리하는 React 훅
import React, { useState } from 'react';

// 다국어 지원을 위한 react-i18next 라이브러리를 가져옵니다
// useTranslation: 번역 함수와 현재 언어 정보를 제공하는 훅
import { useTranslation } from 'react-i18next';

// UI 컴포넌트들을 가져옵니다
import ThemeSwitch from '@/components/ui/ThemeSwitch';  // 다크/라이트 테마 전환 버튼

// 아이콘 컴포넌트들을 가져옵니다
import GitHubIcon from '@/components/icons/GitHubIcon';      // GitHub 아이콘
import SponsorIcon from '@/components/icons/SponsorIcon';    // 스폰서 아이콘
import WeChatIcon from '@/components/icons/WeChatIcon';      // WeChat 아이콘
import DiscordIcon from '@/components/icons/DiscordIcon';    // Discord 아이콘

// 다이얼로그 컴포넌트들을 가져옵니다
import SponsorDialog from '@/components/ui/SponsorDialog';  // 스폰서 정보 다이얼로그
import WeChatDialog from '@/components/ui/WeChatDialog';    // WeChat QR코드 다이얼로그

/**
 * Header 컴포넌트의 props 타입 정의
 * TypeScript에서 컴포넌트가 받을 수 있는 속성들을 정의합니다
 */
interface HeaderProps {
  onToggleSidebar: () => void;  // 사이드바 토글 함수
}

/**
 * Header 컴포넌트: 애플리케이션의 상단 헤더
 * 
 * 이 컴포넌트는 다음과 같은 요소들을 포함합니다:
 * - 사이드바 토글 버튼
 * - 애플리케이션 제목
 * - 버전 정보
 * - GitHub 링크
 * - WeChat/Discord 링크 (언어에 따라 다름)
 * - 스폰서 링크
 * - 테마 전환 버튼
 */
const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  // 다국어 지원 훅 사용
  // t: 번역 함수 (예: t('app.title') → "MCP Hub")
  // i18n: 현재 언어 정보 (예: i18n.language → "ko", "en", "zh")
  const { t, i18n } = useTranslation();
  
  // 다이얼로그 열림/닫힘 상태 관리
  // useState는 컴포넌트의 상태를 관리하는 React 훅입니다
  const [sponsorDialogOpen, setSponsorDialogOpen] = useState(false);  // 스폰서 다이얼로그 상태
  const [wechatDialogOpen, setWechatDialogOpen] = useState(false);    // WeChat 다이얼로그 상태

  return (
    // 헤더 컨테이너
    // bg-white dark:bg-gray-800: 라이트/다크 테마에 따른 배경색
    // shadow-sm: 약간의 그림자 효과
    // z-10: 다른 요소들보다 위에 표시되도록 z-index 설정
    <header className="bg-white dark:bg-gray-800 shadow-sm z-10">
      {/* 헤더 내용을 담는 컨테이너 */}
      {/* flex justify-between: 좌우 끝에 요소들을 배치 */}
      {/* items-center: 세로 중앙 정렬 */}
      {/* px-3 py-3: 좌우 패딩 3, 상하 패딩 3 */}
      <div className="flex justify-between items-center px-3 py-3">
        {/* 왼쪽 영역: 사이드바 토글 버튼과 제목 */}
        <div className="flex items-center">
          {/* 사이드바 토글 버튼 */}
          {/* onClick: 버튼 클릭 시 onToggleSidebar 함수 호출 */}
          {/* aria-label: 스크린 리더를 위한 접근성 라벨 */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
            aria-label={t('app.toggleSidebar')}
          >
            {/* 햄버거 메뉴 아이콘 (SVG) */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* 애플리케이션 제목 */}
          {/* ml-4: 왼쪽 마진 4 (토글 버튼과의 간격) */}
          <h1 className="ml-4 text-xl font-bold text-gray-900 dark:text-white">{t('app.title')}</h1>
        </div>

        {/* 오른쪽 영역: 버전 정보, 링크들, 테마 스위치 */}
        {/* flex items-center space-x-4: 가로 배치, 세로 중앙 정렬, 요소 간 간격 4 */}
        <div className="flex items-center space-x-4">
          {/* 버전 정보 표시 */}
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {import.meta.env.PACKAGE_VERSION === 'dev'
              ? import.meta.env.PACKAGE_VERSION
              : `v${import.meta.env.PACKAGE_VERSION}`}
          </span>
          
          {/* GitHub 링크 */}
          <a
            href="https://github.com/samanhappy/mcphub"
            target="_blank"  // 새 탭에서 열기
            rel="noopener noreferrer"  // 보안을 위한 속성
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            aria-label="GitHub Repository"
          >
            <GitHubIcon className="h-5 w-5" />
          </a>
          
          {/* 언어에 따른 WeChat/Discord 링크 */}
          {i18n.language === 'zh' ? (
            // 중국어인 경우 WeChat 버튼 표시
            <button
              onClick={() => setWechatDialogOpen(true)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 focus:outline-none"
              aria-label={t('wechat.label')}
            >
              <WeChatIcon className="h-5 w-5" />
            </button>
          ) : (
            // 그 외 언어인 경우 Discord 링크 표시
            <a
              href="https://discord.gg/qMKNsn5Q"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              aria-label={t('discord.label')}
            >
              <DiscordIcon className="h-5 w-5" />
            </a>
          )}
          
          {/* 스폰서 버튼 */}
          <button
            onClick={() => setSponsorDialogOpen(true)}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 focus:outline-none"
            aria-label={t('sponsor.label')}
          >
            <SponsorIcon className="h-5 w-5" />
          </button>
          
          {/* 테마 전환 버튼 */}
          <ThemeSwitch />
        </div>
      </div>
      
      {/* 다이얼로그 컴포넌트들 */}
      {/* open: 다이얼로그 열림/닫힘 상태 */}
      {/* onOpenChange: 다이얼로그 상태 변경 함수 */}
      <SponsorDialog open={sponsorDialogOpen} onOpenChange={setSponsorDialogOpen} />
      <WeChatDialog open={wechatDialogOpen} onOpenChange={setWechatDialogOpen} />
    </header>
  );
};

// Header 컴포넌트를 다른 파일에서 사용할 수 있도록 내보냅니다
export default Header;