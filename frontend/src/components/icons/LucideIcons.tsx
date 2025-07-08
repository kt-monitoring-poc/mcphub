/**
 * Lucide 아이콘 컴포넌트 모음
 * 
 * 애플리케이션에서 사용하는 Lucide React 아이콘들을 중앙에서 관리하는 모듈입니다.
 * 필요한 아이콘들만 선별적으로 import하여 번들 크기를 최적화합니다.
 * 
 * 포함된 아이콘들:
 * - 네비게이션: ChevronDown, ChevronRight
 * - 액션: Edit, Trash, Copy, Check, Play
 * - 사용자: User, Settings, LogOut
 * - 상태: CheckCircle, XCircle, AlertCircle, Loader
 * - 기타: Info
 */

import {
  ChevronDown,
  ChevronRight,
  Edit,
  Trash,
  Copy,
  Check,
  User,
  Settings,
  LogOut,
  Info,
  Play,
  Loader,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'

// 개별 아이콘 export (named export)
export {
  ChevronDown,
  ChevronRight,
  Edit,
  Trash,
  Copy,
  Check,
  User,
  Settings,
  LogOut,
  Info,
  Play,
  Loader,
  CheckCircle,
  XCircle,
  AlertCircle
}

/**
 * Lucide 아이콘 컬렉션 객체
 * 
 * 모든 사용 가능한 아이콘들을 하나의 객체로 묶어서 제공합니다.
 * 동적으로 아이콘을 선택해야 할 때 유용합니다.
 * 
 * @example
 * ```tsx
 * import LucideIcons from './LucideIcons';
 * 
 * const iconName = 'CheckCircle';
 * const Icon = LucideIcons[iconName];
 * return <Icon className="w-4 h-4" />;
 * ```
 */
const LucideIcons = {
  ChevronDown,
  ChevronRight,
  Edit,
  Trash,
  Copy,
  Check,
  User,
  Settings,
  LogOut,
  Info,
  Play,
  Loader,
  CheckCircle,
  XCircle,
  AlertCircle
}

export default LucideIcons