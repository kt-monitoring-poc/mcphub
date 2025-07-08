/**
 * 도구 실행 결과 컴포넌트
 * 
 * MCP 도구 실행 결과를 사용자에게 표시하는 컴포넌트입니다.
 * 성공/실패 상태에 따라 적절한 UI를 제공하며, 다양한 콘텐츠 타입을 지원합니다.
 * 
 * 주요 기능:
 * - 성공/실패 상태 표시
 * - 다양한 콘텐츠 타입 렌더링 (텍스트, 이미지, JSON)
 * - 구조화된 데이터 표시
 * - 에러 메시지 표시
 * - 닫기 기능
 * - 상태별 아이콘 표시
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, AlertCircle } from '@/components/icons/LucideIcons';

/**
 * ToolResult 컴포넌트의 Props 인터페이스
 */
interface ToolResultProps {
  /** 도구 실행 결과 */
  result: {
    /** 실행 성공 여부 */
    success: boolean;
    /** 결과 콘텐츠 배열 */
    content?: Array<{
      /** 콘텐츠 타입 */
      type: string;
      /** 텍스트 콘텐츠 */
      text?: string;
      /** 기타 속성들 */
      [key: string]: any;
    }>;
    /** 에러 메시지 */
    error?: string;
    /** 일반 메시지 */
    message?: string;
  };
  /** 결과 창 닫기 핸들러 */
  onClose: () => void;
}

/**
 * 도구 실행 결과 컴포넌트
 * 
 * MCP 도구의 실행 결과를 사용자 친화적인 형태로 표시합니다.
 * 다양한 콘텐츠 타입을 지원하고 적절한 포맷팅을 제공합니다.
 * 
 * @param {ToolResultProps} props - 컴포넌트 props
 * @param {Object} props.result - 도구 실행 결과
 * @param {boolean} props.result.success - 실행 성공 여부
 * @param {Array} [props.result.content] - 결과 콘텐츠 배열
 * @param {string} [props.result.error] - 에러 메시지
 * @param {string} [props.result.message] - 일반 메시지
 * @param {() => void} props.onClose - 결과 창 닫기 핸들러
 * @returns {JSX.Element} 도구 결과 컴포넌트
 */
const ToolResult: React.FC<ToolResultProps> = ({ result, onClose }) => {
  const { t } = useTranslation();
  // result.content에서 콘텐츠 추출
  const content = result.content;

  /**
   * 콘텐츠를 렌더링하는 함수
   * 
   * 배열 또는 단일 아이템을 처리하여 적절한 React 노드로 변환합니다.
   * 
   * @param {any} content - 렌더링할 콘텐츠
   * @returns {React.ReactNode} 렌더링된 콘텐츠
   */
  const renderContent = (content: any): React.ReactNode => {
    if (Array.isArray(content)) {
      return content.map((item, index) => (
        <div key={index} className="mb-3 last:mb-0">
          {renderContentItem(item)}
        </div>
      ));
    }

    return renderContentItem(content);
  };

  /**
   * 개별 콘텐츠 아이템을 렌더링하는 함수
   * 
   * 콘텐츠 타입에 따라 적절한 렌더링 방식을 선택합니다.
   * 
   * @param {any} item - 렌더링할 아이템
   * @returns {React.ReactNode} 렌더링된 아이템
   */
  const renderContentItem = (item: any): React.ReactNode => {
    // 문자열인 경우
    if (typeof item === 'string') {
      return (
        <div className="bg-gray-50 rounded-md p-3">
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">{item}</pre>
        </div>
      );
    }

    // 객체인 경우
    if (typeof item === 'object' && item !== null) {
      // 텍스트 타입
      if (item.type === 'text' && item.text) {
        return (
          <div className="bg-gray-50 rounded-md p-3">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">{item.text}</pre>
          </div>
        );
      }

      // 이미지 타입
      if (item.type === 'image' && item.data) {
        return (
          <div className="bg-gray-50 rounded-md p-3">
            <img
              src={`data:${item.mimeType || 'image/png'};base64,${item.data}`}
              alt={t('tool.toolResult')}
              className="max-w-full h-auto rounded-md"
            />
          </div>
        );
      }

      // 기타 구조화된 콘텐츠 - JSON으로 파싱 시도
      try {
        const parsed = typeof item === 'string' ? JSON.parse(item) : item;

        return (
          <div className="bg-gray-50 rounded-md p-3">
            <div className="text-xs text-gray-500 mb-2">{t('tool.jsonResponse')}</div>
            <pre className="text-sm text-gray-800 overflow-auto">{JSON.stringify(parsed, null, 2)}</pre>
          </div>
        );
      } catch {
        // JSON이 아닌 경우 문자열로 표시
        return (
          <div className="bg-gray-50 rounded-md p-3">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">{String(item)}</pre>
          </div>
        );
      }
    }

    // 기타 모든 경우 문자열로 변환
    return (
      <div className="bg-gray-50 rounded-md p-3">
        <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">{String(item)}</pre>
      </div>
    );
  };

  return (
    <div className="border border-gray-300 rounded-lg bg-white shadow-sm">
      {/* 헤더 영역 */}
      <div className="border-b border-gray-300 px-4 py-3 bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          {/* 상태 표시 */}
          <div className="flex items-center space-x-2">
            {result.success ? (
              <CheckCircle size={20} className="text-status-green" />
            ) : (
              <XCircle size={20} className="text-status-red" />
            )}
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                {t('tool.execution')} {result.success ? t('tool.successful') : t('tool.failed')}
              </h4>
            </div>
          </div>
          
          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="p-4">
        {result.success ? (
          // 성공 시 결과 표시
          <div>
            {result.content && result.content.length > 0 ? (
              <div>
                <div className="text-sm text-gray-600 mb-3">{t('tool.result')}</div>
                {renderContent(result.content)}
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">
                {t('tool.noContent')}
              </div>
            )}
          </div>
        ) : (
          // 실패 시 에러 표시
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <AlertCircle size={16} className="text-red-500" />
              <span className="text-sm font-medium text-red-700">{t('tool.error')}</span>
            </div>
            {content && content.length > 0 ? (
              <div>
                <div className="text-sm text-gray-600 mb-3">{t('tool.errorDetails')}</div>
                {renderContent(content)}
              </div>
            ) : (
              <div className="bg-red-50 border border-red-300 rounded-md p-3">
                <pre className="text-sm text-red-800 whitespace-pre-wrap">
                  {result.error || result.message || t('tool.unknownError')}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolResult;
