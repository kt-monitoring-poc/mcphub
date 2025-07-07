/**
 * 도구 카드 컴포넌트
 * 
 * MCP 서버의 개별 도구를 표시하고 관리하는 카드 컴포넌트입니다.
 * 도구의 활성화/비활성화, 설명 편집, 실행 기능을 제공합니다.
 * 
 * 주요 기능:
 * - 도구 정보 표시 (이름, 설명, 스키마)
 * - 도구 활성화/비활성화 토글
 * - 설명 인라인 편집
 * - 동적 폼을 통한 도구 실행
 * - 실행 결과 표시
 * - 확장/축소 가능한 UI
 * - 로컬 스토리지 기반 폼 데이터 저장
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Tool } from '@/types'
import { ChevronDown, ChevronRight, Play, Loader, Edit, Check } from '@/components/icons/LucideIcons'
import { callTool, ToolCallResult, updateToolDescription } from '@/services/toolService'
import { Switch } from './ToggleGroup'
import DynamicForm from './DynamicForm'
import ToolResult from './ToolResult'

/**
 * ToolCard 컴포넌트의 Props 인터페이스
 */
interface ToolCardProps {
  /** 도구가 속한 서버명 */
  server: string
  /** 도구 정보 */
  tool: Tool
  /** 도구 활성화/비활성화 토글 핸들러 */
  onToggle?: (toolName: string, enabled: boolean) => void
  /** 도구 설명 업데이트 핸들러 */
  onDescriptionUpdate?: (toolName: string, description: string) => void
}

/**
 * 도구 카드 컴포넌트
 * 
 * MCP 서버의 개별 도구를 관리하고 실행할 수 있는 카드 형태의 컴포넌트입니다.
 * 확장 가능한 UI를 통해 도구의 세부 정보와 실행 폼을 제공합니다.
 * 
 * @param {ToolCardProps} props - 컴포넌트 props
 * @param {string} props.server - 도구가 속한 서버명
 * @param {Tool} props.tool - 도구 정보
 * @param {(toolName: string, enabled: boolean) => void} [props.onToggle] - 도구 활성화/비활성화 토글 핸들러
 * @param {(toolName: string, description: string) => void} [props.onDescriptionUpdate] - 도구 설명 업데이트 핸들러
 * @returns {JSX.Element} 도구 카드 컴포넌트
 */
const ToolCard = ({ tool, server, onToggle, onDescriptionUpdate }: ToolCardProps) => {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)
  const [showRunForm, setShowRunForm] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<ToolCallResult | null>(null)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [customDescription, setCustomDescription] = useState(tool.description || '')
  const descriptionInputRef = useRef<HTMLInputElement>(null)
  const descriptionTextRef = useRef<HTMLSpanElement>(null)
  const [textWidth, setTextWidth] = useState<number>(0)

  // 편집 모드 활성화 시 입력 필드에 포커스
  useEffect(() => {
    if (isEditingDescription && descriptionInputRef.current) {
      descriptionInputRef.current.focus()
      // 텍스트 너비에 맞춰 입력 필드 크기 조정
      if (textWidth > 0) {
        descriptionInputRef.current.style.width = `${textWidth + 20}px` // 여백 추가
      }
    }
  }, [isEditingDescription, textWidth])

  // 편집 모드가 아닐 때 텍스트 너비 측정
  useEffect(() => {
    if (!isEditingDescription && descriptionTextRef.current) {
      setTextWidth(descriptionTextRef.current.offsetWidth)
    }
  }, [isEditingDescription, customDescription])

  /**
   * localStorage 키 생성 함수
   * 
   * 도구명과 서버명을 기반으로 고유한 storage 키를 생성합니다.
   * 
   * @returns {string} localStorage 키
   */
  const getStorageKey = useCallback(() => {
    return `mcphub_tool_form_${server ? `${server}_` : ''}${tool.name}`
  }, [tool.name, server])

  /**
   * 저장된 폼 데이터 삭제 함수
   * 
   * localStorage에서 해당 도구의 폼 데이터를 삭제합니다.
   */
  const clearStoredFormData = useCallback(() => {
    localStorage.removeItem(getStorageKey())
  }, [getStorageKey])

  /**
   * 도구 활성화/비활성화 토글 핸들러
   * 
   * @param {boolean} enabled - 활성화 상태
   */
  const handleToggle = (enabled: boolean) => {
    if (onToggle) {
      onToggle(tool.name, enabled)
    }
  }

  /**
   * 설명 편집 모드 활성화 핸들러
   */
  const handleDescriptionEdit = () => {
    setIsEditingDescription(true)
  }

  /**
   * 설명 저장 핸들러
   * 
   * 서버에 변경된 설명을 저장하고 결과에 따라 UI를 업데이트합니다.
   */
  const handleDescriptionSave = async () => {
    try {
      const result = await updateToolDescription(server, tool.name, customDescription)
      if (result.success) {
        setIsEditingDescription(false)
        if (onDescriptionUpdate) {
          onDescriptionUpdate(tool.name, customDescription)
        }
      } else {
        // 에러 시 원래 값으로 복원
        setCustomDescription(tool.description || '')
        console.error('Failed to update tool description:', result.error)
      }
    } catch (error) {
      console.error('Error updating tool description:', error)
      setCustomDescription(tool.description || '')
      setIsEditingDescription(false)
    }
  }

  /**
   * 설명 입력 변경 핸들러
   * 
   * @param {React.ChangeEvent<HTMLInputElement>} e - 입력 변경 이벤트
   */
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomDescription(e.target.value)
  }

  /**
   * 설명 입력 키 다운 핸들러
   * 
   * Enter 키로 저장, Escape 키로 취소 처리합니다.
   * 
   * @param {React.KeyboardEvent<HTMLInputElement>} e - 키보드 이벤트
   */
  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleDescriptionSave()
    } else if (e.key === 'Escape') {
      setCustomDescription(tool.description || '')
      setIsEditingDescription(false)
    }
  }

  /**
   * 도구 실행 핸들러
   * 
   * 주어진 인수로 도구를 실행하고 결과를 저장합니다.
   * 
   * @param {Record<string, any>} arguments_ - 도구 실행 인수
   */
  const handleRunTool = async (arguments_: Record<string, any>) => {
    setIsRunning(true)
    try {
      const result = await callTool({
        toolName: tool.name,
        arguments: arguments_,
      }, server)

      setResult(result)
      // 성공 시 폼 데이터 삭제 (주석 처리됨)
      // clearStoredFormData()
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      })
    } finally {
      setIsRunning(false)
    }
  }

  /**
   * 도구 실행 취소 핸들러
   * 
   * 실행 폼을 숨기고 저장된 폼 데이터를 삭제합니다.
   */
  const handleCancelRun = () => {
    setShowRunForm(false)
    // 취소 시 폼 데이터 삭제
    clearStoredFormData()
    setResult(null)
  }

  /**
   * 결과 창 닫기 핸들러
   */
  const handleCloseResult = () => {
    setResult(null)
  }

  return (
    <div className="bg-white border border-gray-200 shadow rounded-lg p-4 mb-4">
      {/* 카드 헤더 */}
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* 도구 정보 */}
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900">
            {tool.name.replace(server + '-', '')}
            <span className="ml-2 text-sm font-normal text-gray-600 inline-flex items-center">
              {isEditingDescription ? (
                // 편집 모드: 입력 필드와 저장 버튼
                <>
                  <input
                    ref={descriptionInputRef}
                    type="text"
                    className="px-2 py-1 border border-blue-300 rounded bg-white text-sm focus:outline-none form-input"
                    value={customDescription}
                    onChange={handleDescriptionChange}
                    onKeyDown={handleDescriptionKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      minWidth: '100px',
                      width: textWidth > 0 ? `${textWidth + 20}px` : 'auto'
                    }}
                  />
                  <button
                    className="ml-2 p-1 text-green-600 hover:text-green-800 cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDescriptionSave()
                    }}
                  >
                    <Check size={16} />
                  </button>
                </>
              ) : (
                // 표시 모드: 설명 텍스트와 편집 버튼
                <>
                  <span ref={descriptionTextRef}>{customDescription || t('tool.noDescription')}</span>
                  <button
                    className="ml-2 p-1 text-gray-500 hover:text-blue-600 cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDescriptionEdit()
                    }}
                  >
                    <Edit size={14} />
                  </button>
                </>
              )}
            </span>
          </h3>
        </div>

        {/* 카드 컨트롤 */}
        <div className="flex items-center space-x-2">
          {/* 활성화 토글 스위치 */}
          <div
            className="flex items-center space-x-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Switch
              checked={tool.enabled ?? true}
              onCheckedChange={handleToggle}
              disabled={isRunning}
            />
          </div>

          {/* 실행 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(true) // 실행 폼 표시 시 카드 확장
              setShowRunForm(true)
            }}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors btn-primary"
            disabled={isRunning || !tool.enabled}
          >
            {isRunning ? (
              <Loader size={14} className="animate-spin" />
            ) : (
              <Play size={14} />
            )}
            <span>{isRunning ? t('tool.running') : t('tool.run')}</span>
          </button>

          {/* 확장/축소 버튼 */}
          <button className="text-gray-400 hover:text-gray-600">
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </div>

      {/* 확장된 콘텐츠 */}
      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* 스키마 표시 */}
          {!showRunForm && (
            <div className="bg-gray-50 rounded p-3 border border-gray-300">
              <h4 className="text-sm font-medium text-gray-900 mb-2">{t('tool.inputSchema')}</h4>
              <pre className="text-xs text-gray-600 overflow-auto">
                {JSON.stringify(tool.inputSchema, null, 2)}
              </pre>
            </div>
          )}

          {/* 실행 폼 */}
          {showRunForm && (
            <div className="border border-gray-300 rounded-lg p-4">
              <DynamicForm
                schema={tool.inputSchema || { type: 'object' }}
                onSubmit={handleRunTool}
                onCancel={handleCancelRun}
                loading={isRunning}
                storageKey={getStorageKey()}
                title={t('tool.runToolWithName', { name: tool.name.replace(server + '-', '') })}
              />
              
              {/* 도구 실행 결과 */}
              {result && (
                <div className="mt-4">
                  <ToolResult result={result} onClose={handleCloseResult} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ToolCard