/**
 * 암호학적으로 안전한 랜덤 키 생성 함수
 * 
 * 이 함수는 웹 암호화 API(crypto.getRandomValues)를 사용하여
 * 암호학적으로 안전한 랜덤 문자열을 생성합니다.
 * 
 * 일반적인 Math.random()과 달리, 이 함수는 예측 불가능한
 * 진정한 랜덤 값을 생성하므로 보안에 민감한 용도에 적합합니다.
 * 
 * 사용 예시:
 * - API 키 생성
 * - 세션 토큰 생성
 * - 임시 비밀번호 생성
 * - Bearer 토큰 생성
 * 
 * @param length - 생성할 키의 길이 (기본값: 32)
 * @returns 지정된 길이의 랜덤 문자열
 */
export function generateRandomKey(length: number = 32): string {
  // 사용할 문자 집합 정의
  // 대문자, 소문자, 숫자를 포함하여 다양한 문자 조합 가능
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
  // 암호학적으로 안전한 랜덤 바이트 배열 생성
  // Uint8Array는 0-255 범위의 부호 없는 8비트 정수 배열입니다
  const array = new Uint8Array(length);
  
  // 웹 암호화 API를 사용하여 암호학적으로 안전한 랜덤 값 생성
  // 이 함수는 운영체제의 엔트로피 소스를 사용하여 예측 불가능한 값을 생성합니다
  crypto.getRandomValues(array);
  
  // 바이트 배열을 문자열로 변환
  return Array.from(array)
    // 각 바이트 값을 문자 집합의 인덱스로 변환
    // 모듈로 연산(%)을 사용하여 0-61 범위로 매핑
    .map((x) => characters.charAt(x % characters.length))
    // 모든 문자를 하나의 문자열로 결합
    .join('');
}
