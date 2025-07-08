// clsx: 조건부로 CSS 클래스명을 결합하는 유틸리티 라이브러리
// ClassValue: clsx에서 사용하는 클래스 값의 타입 (문자열, 객체, 배열 등)
import { ClassValue, clsx } from 'clsx';

// tailwind-merge: Tailwind CSS 클래스들을 중복 제거하고 충돌을 해결하는 라이브러리
// 같은 속성의 클래스가 있을 때 마지막에 오는 클래스가 우선순위를 가집니다
import { twMerge } from 'tailwind-merge';

/**
 * CSS 클래스명 결합 및 중복 제거 유틸리티 함수
 * 
 * 이 함수는 여러 CSS 클래스명을 조건부로 결합하고, Tailwind CSS 클래스의 중복을 제거합니다.
 * React 컴포넌트에서 동적으로 클래스를 적용할 때 매우 유용합니다.
 * 
 * 사용 예시:
 * ```tsx
 * // 기본 클래스와 조건부 클래스 결합
 * cn(
 *   "base-class",                    // 항상 적용되는 기본 클래스
 *   isActive && "active-class",      // 조건부 클래스
 *   variant === "primary" && "primary-class"  // 다른 조건부 클래스
 * )
 * 
 * // Tailwind CSS 클래스 충돌 해결
 * cn(
 *   "text-red-500",     // 빨간색 텍스트
 *   isError && "text-blue-500"  // 에러일 때 파란색 텍스트 (충돌!)
 * )
 * // 결과: "text-blue-500" (마지막 클래스가 우선순위)
 * ```
 * 
 * @param inputs - 결합할 CSS 클래스들 (문자열, 객체, 배열, 조건부 표현식 등)
 * @returns 중복이 제거되고 충돌이 해결된 CSS 클래스 문자열
 */
export function cn(...inputs: ClassValue[]) {
  // 1. clsx로 모든 클래스들을 결합 (조건부 클래스 처리)
  // 2. twMerge로 Tailwind CSS 클래스 중복 제거 및 충돌 해결
  return twMerge(clsx(inputs));
}