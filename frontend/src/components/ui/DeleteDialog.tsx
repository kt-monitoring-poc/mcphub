/**
 * 삭제 확인 다이얼로그 컴포넌트
 * 
 * 서버나 그룹 삭제 시 사용자에게 확인을 요청하는 모달 다이얼로그입니다.
 * 삭제 작업의 위험성을 알리고 사용자의 최종 확인을 받습니다.
 * 
 * 주요 기능:
 * - 삭제 대상 이름 표시
 * - 서버/그룹 구분 메시지
 * - 취소/삭제 버튼 제공
 * - 모달 오버레이
 * - 다국어 지원
 */

import { useTranslation } from 'react-i18next'

/**
 * DeleteDialog 컴포넌트의 Props 인터페이스
 */
interface DeleteDialogProps {
  /** 다이얼로그 열림 상태 */
  isOpen: boolean
  /** 다이얼로그 닫기 핸들러 */
  onClose: () => void
  /** 삭제 확인 핸들러 */
  onConfirm: () => void
  /** 삭제할 서버/그룹 이름 */
  serverName: string
  /** 그룹 삭제 여부 (기본값: false) */
  isGroup?: boolean
}

/**
 * 삭제 확인 다이얼로그 컴포넌트
 * 
 * 서버나 그룹을 삭제하기 전에 사용자에게 확인을 요청하는 모달 다이얼로그입니다.
 * 삭제 대상의 이름을 표시하고 경고 메시지를 제공합니다.
 * 
 * @param {DeleteDialogProps} props - 컴포넌트 props
 * @param {boolean} props.isOpen - 다이얼로그 열림 상태
 * @param {() => void} props.onClose - 다이얼로그 닫기 핸들러
 * @param {() => void} props.onConfirm - 삭제 확인 핸들러
 * @param {string} props.serverName - 삭제할 서버/그룹 이름
 * @param {boolean} [props.isGroup=false] - 그룹 삭제 여부
 * @returns {JSX.Element | null} 삭제 확인 다이얼로그 또는 null
 */
const DeleteDialog = ({ isOpen, onClose, onConfirm, serverName, isGroup = false }: DeleteDialogProps) => {
  const { t } = useTranslation()

  // 다이얼로그가 닫혀있으면 렌더링하지 않음
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        <div className="p-6">
          {/* 다이얼로그 제목 */}
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            {isGroup ? t('groups.confirmDelete') : t('server.confirmDelete')}
          </h3>
          
          {/* 경고 메시지 */}
          <p className="text-gray-500 mb-6">
            {isGroup
              ? t('groups.deleteWarning', { name: serverName })
              : t('server.deleteWarning', { name: serverName })}
          </p>
          
          {/* 액션 버튼들 */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 btn-secondary"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 btn-danger"
            >
              {t('common.delete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DeleteDialog