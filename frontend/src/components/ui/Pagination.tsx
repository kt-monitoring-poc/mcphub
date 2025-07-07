/**
 * 페이지네이션 컴포넌트
 * 
 * 대량의 데이터를 여러 페이지로 나누어 표시할 때 사용하는 페이지네이션 컴포넌트입니다.
 * 이전/다음 버튼과 페이지 번호 버튼을 제공하며, 페이지가 많을 때는 생략 표시(...)를 사용합니다.
 * 
 * 주요 기능:
 * - 이전/다음 페이지 버튼
 * - 페이지 번호 직접 선택
 * - 많은 페이지 시 생략 표시(...) 
 * - 현재 페이지 하이라이트
 * - 첫 페이지/마지막 페이지 항상 표시
 * - 페이지가 1개 이하일 때 숨김
 */

import React from 'react';

/**
 * Pagination 컴포넌트의 Props 인터페이스
 */
interface PaginationProps {
  /** 현재 페이지 번호 */
  currentPage: number;
  /** 전체 페이지 수 */
  totalPages: number;
  /** 페이지 변경 핸들러 */
  onPageChange: (page: number) => void;
}

/**
 * 페이지네이션 컴포넌트
 * 
 * 대량의 데이터를 페이지 단위로 나누어 표시할 때 사용하는 네비게이션 컴포넌트입니다.
 * 사용자가 원하는 페이지로 쉽게 이동할 수 있도록 도와줍니다.
 * 
 * @param {PaginationProps} props - 컴포넌트 props
 * @param {number} props.currentPage - 현재 페이지 번호
 * @param {number} props.totalPages - 전체 페이지 수
 * @param {(page: number) => void} props.onPageChange - 페이지 변경 핸들러
 * @returns {JSX.Element | null} 페이지네이션 컴포넌트 또는 null
 * 
 * @example
 * ```tsx
 * <Pagination 
 *   currentPage={3}
 *   totalPages={10}
 *   onPageChange={(page) => setCurrentPage(page)}
 * />
 * ```
 */
const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange
}) => {
  /**
   * 페이지 버튼들을 생성하는 함수
   * 
   * 현재 페이지를 중심으로 표시할 페이지 버튼들을 생성합니다.
   * 페이지가 많을 때는 생략 표시(...)를 사용하여 UI를 간소화합니다.
   * 
   * @returns {JSX.Element[]} 페이지 버튼 요소들의 배열
   */
  const getPageButtons = () => {
    const buttons = [];
    const maxDisplayedPages = 5; // 표시할 최대 페이지 버튼 수

    // 첫 번째 페이지 항상 표시
    buttons.push(
      <button
        key="first"
        onClick={() => onPageChange(1)}
        className={`px-3 py-1 mx-1 rounded ${currentPage === 1
          ? 'bg-blue-500 text-white btn-primary'
          : 'bg-gray-200 hover:bg-gray-300 text-gray-700 btn-secondary'
          }`}
      >
        1
      </button>
    );

    // 시작 범위 계산
    const startPage = Math.max(2, currentPage - Math.floor(maxDisplayedPages / 2));

    // 첫 페이지 다음에 생략 표시가 필요한 경우
    if (startPage > 2) {
      buttons.push(
        <span key="ellipsis1" className="px-3 py-1">
          ...
        </span>
      );
    }

    // 중간 페이지들
    for (let i = startPage; i <= Math.min(totalPages - 1, startPage + maxDisplayedPages - 3); i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`px-3 py-1 mx-1 rounded ${currentPage === i
            ? 'bg-blue-500 text-white btn-primary'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700 btn-secondary'
            }`}
        >
          {i}
        </button>
      );
    }

    // 마지막 페이지 전에 생략 표시가 필요한 경우
    if (startPage + maxDisplayedPages - 3 < totalPages - 1) {
      buttons.push(
        <span key="ellipsis2" className="px-3 py-1">
          ...
        </span>
      );
    }

    // 마지막 페이지 항상 표시 (페이지가 2개 이상인 경우)
    if (totalPages > 1) {
      buttons.push(
        <button
          key="last"
          onClick={() => onPageChange(totalPages)}
          className={`px-3 py-1 mx-1 rounded ${currentPage === totalPages
            ? 'bg-blue-500 text-white btn-primary'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700 btn-secondary'
            }`}
        >
          {totalPages}
        </button>
      );
    }

    return buttons;
  };

  // 페이지가 1개 이하면 페이지네이션을 렌더링하지 않음
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex justify-center items-center my-6">
      {/* 이전 페이지 버튼 */}
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={`px-3 py-1 rounded mr-2 ${currentPage === 1
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-gray-200 hover:bg-gray-300 text-gray-700 btn-secondary'
          }`}
      >
        &laquo; Prev
      </button>

      {/* 페이지 번호 버튼들 */}
      <div className="flex">{getPageButtons()}</div>

      {/* 다음 페이지 버튼 */}
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className={`px-3 py-1 rounded ml-2 ${currentPage === totalPages
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-gray-200 hover:bg-gray-300 text-gray-700 btn-secondary'
          }`}
      >
        Next &raquo;
      </button>
    </div>
  );
};

export default Pagination;