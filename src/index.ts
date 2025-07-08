/**
 * MCPHub 애플리케이션의 메인 진입점
 * 
 * 이 파일은 MCPHub 서버 애플리케이션을 시작하는 역할을 합니다.
 * - TypeORM 메타데이터 리플렉션 설정
 * - 서버 인스턴스 생성 및 초기화
 * - 애플리케이션 부팅 프로세스 관리
 */

import 'reflect-metadata'; // TypeORM 데코레이터 메타데이터 지원을 위해 필요
import AppServer from './server.js';

// 애플리케이션 서버 인스턴스 생성
const appServer = new AppServer();

/**
 * 애플리케이션 부팅 함수
 * 
 * 서버 초기화 및 시작 과정을 관리합니다.
 * - 데이터베이스 연결 설정
 * - MCP 서버들 연결 초기화
 * - Express 서버 시작
 * 
 * @throws {Error} 초기화 또는 시작 과정에서 오류 발생 시
 */
async function boot() {
  try {
    // 서버 초기화 (데이터베이스 연결, MCP 서버 연결 등)
    await appServer.initialize();
    
    // HTTP 서버 시작
    appServer.start();
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

// 애플리케이션 시작
boot();

// Express 앱 인스턴스를 외부에서 사용할 수 있도록 내보냄 (테스트 등에서 활용)
export default appServer.getApp();
