/**
 * 로그 관리 서비스
 * 
 * 시스템 로그의 수집, 저장, 포맷팅, 실시간 스트리밍을 담당하는 중앙집중식 로그 서비스입니다.
 * 콘솔 출력을 가로채서 구조화된 로그로 변환하고, 실시간 스트리밍을 위한 이벤트 시스템을 제공합니다.
 * 
 * 주요 기능:
 * - 콘솔 메소드 오버라이드를 통한 로그 수집
 * - 구조화된 로그 데이터 관리
 * - ANSI 컬러 코드를 사용한 콘솔 출력 포맷팅
 * - 실시간 로그 스트리밍 (EventEmitter 기반)
 * - 메모리 기반 로그 저장소 (최대 1000개 항목)
 */

import { EventEmitter } from 'events';
import * as os from 'os';
import * as process from 'process';

/**
 * 로그 항목 인터페이스
 * 각 로그 메시지의 구조를 정의합니다.
 */
interface LogEntry {
  /** 로그 생성 시간 (Unix 타임스탬프) */
  timestamp: number;
  /** 로그 레벨 */
  type: 'info' | 'error' | 'warn' | 'debug';
  /** 로그 소스 (서버명, 모듈명 등) */
  source: string;
  /** 로그 메시지 내용 */
  message: string;
  /** 프로세스 ID (선택사항) */
  processId?: string;
}

/**
 * ANSI 컬러 코드 정의
 * 콘솔 출력에 색상과 스타일을 적용하기 위한 이스케이프 시퀀스들
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',

  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

/**
 * 로그 레벨별 색상 매핑
 * 각 로그 레벨에 대응하는 ANSI 컬러 코드
 */
const levelColors = {
  info: colors.green,
  error: colors.red,
  warn: colors.yellow,
  debug: colors.cyan,
};

/**
 * 메모리에 보관할 최대 로그 수
 * 이 수를 초과하면 오래된 로그부터 삭제됩니다.
 */
const MAX_LOGS = 1000;

/**
 * 로그 서비스 클래스
 * 
 * 시스템의 모든 로그를 중앙에서 관리하는 싱글톤 서비스입니다.
 * 콘솔 메소드를 오버라이드하여 모든 로그를 수집하고,
 * 실시간 스트리밍과 구조화된 저장을 제공합니다.
 */
class LogService {
  /** 메모리에 저장된 로그 항목들 */
  private logs: LogEntry[] = [];
  /** 로그 이벤트 발생을 위한 EventEmitter */
  private logEmitter = new EventEmitter();
  /** 메인 프로세스 ID */
  private mainProcessId: string;
  /** 호스트명 */
  private hostname: string;

  /**
   * LogService 생성자
   * 프로세스 정보를 초기화하고 콘솔 메소드를 오버라이드합니다.
   */
  constructor() {
    this.mainProcessId = process.pid.toString();
    this.hostname = os.hostname();
    this.overrideConsole();
  }

  /**
   * 타임스탬프를 ISO 문자열로 포맷팅
   * 
   * @param {number} timestamp - Unix 타임스탬프
   * @returns {string} ISO 8601 형식의 날짜 문자열
   */
  private formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toISOString();
  }

  /**
   * 콘솔 출력용 로그 메시지 포맷팅
   * 
   * ANSI 컬러 코드를 사용하여 가독성 높은 로그 메시지를 생성합니다.
   * 
   * @param {'info' | 'error' | 'warn' | 'debug'} type - 로그 레벨
   * @param {string} source - 로그 소스
   * @param {string} message - 로그 메시지
   * @param {string} [processId] - 프로세스 ID (선택사항)
   * @returns {string} 포맷팅된 로그 메시지
   */
  private formatLogMessage(
    type: 'info' | 'error' | 'warn' | 'debug',
    source: string,
    message: string,
    processId?: string,
  ): string {
    const timestamp = this.formatTimestamp(Date.now());
    const pid = processId || this.mainProcessId;
    const level = type.toUpperCase();
    const levelColor = levelColors[type];

    return `${colors.dim}[${timestamp}]${colors.reset} ${levelColor}${colors.bright}[${level}]${colors.reset} ${colors.blue}[${pid}]${colors.reset} ${colors.magenta}[${source}]${colors.reset} ${message}`;
  }

  /**
   * 콘솔 메소드 오버라이드
   * 
   * 표준 콘솔 메소드들(log, error, warn, debug)을 가로채서
   * 로그 수집과 포맷팅을 수행합니다.
   */
  private overrideConsole() {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleDebug = console.debug;

    /**
     * 모든 콘솔 메소드에 공통으로 적용되는 로직
     * 
     * @param {'info' | 'error' | 'warn' | 'debug'} type - 로그 레벨
     * @param {Function} originalMethod - 원본 콘솔 메소드
     * @param {...any[]} args - 콘솔 메소드에 전달된 인수들
     */
    const handleConsoleMethod = (
      type: 'info' | 'error' | 'warn' | 'debug',
      originalMethod: (...args: any[]) => void,
      ...args: any[]
    ) => {
      const firstArg = args.length > 0 ? this.formatArgument(args[0]) : { text: '' };
      const remainingArgs = args.slice(1).map((arg) => this.formatArgument(arg).text);
      const combinedMessage = [firstArg.text, ...remainingArgs].join(' ');
      const source = firstArg.source || 'main';
      const processId = firstArg.processId;
      
      this.addLog(type, source, combinedMessage, processId);
      originalMethod.apply(console, [
        this.formatLogMessage(type, source, combinedMessage, processId),
      ]);
    };

    // 각 콘솔 메소드 오버라이드
    console.log = (...args: any[]) => {
      handleConsoleMethod('info', originalConsoleLog, ...args);
    };

    console.error = (...args: any[]) => {
      handleConsoleMethod('error', originalConsoleError, ...args);
    };

    console.warn = (...args: any[]) => {
      handleConsoleMethod('warn', originalConsoleWarn, ...args);
    };

    console.debug = (...args: any[]) => {
      handleConsoleMethod('debug', originalConsoleDebug, ...args);
    };
  }

  /**
   * 인수 포맷팅 및 구조화된 정보 추출
   * 
   * 로그 메시지에서 프로세스 ID, 소스 등의 구조화된 정보를 추출합니다.
   * [processId] [source] message 또는 [processId] [source-processId] message 패턴을 인식합니다.
   * 
   * @param {any} arg - 포맷팅할 인수
   * @returns {{ text: string; source?: string; processId?: string }} 포맷팅된 결과
   */
  private formatArgument(arg: any): { text: string; source?: string; processId?: string } {
    // null과 undefined 처리
    if (arg === null) return { text: 'null' };
    if (arg === undefined) return { text: 'undefined' };

    // 객체 처리 (JSON 직렬화)
    if (typeof arg === 'object') {
      try {
        return { text: JSON.stringify(arg, null, 2) };
      } catch (e) {
        return { text: String(arg) };
      }
    }

    // 구조화된 정보가 포함된 문자열 처리
    const argStr = String(arg);

    // [processId] [source] message 또는 [processId] [source-processId] message 패턴 검사
    const structuredPattern = /^\s*\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.*)/;
    const match = argStr.match(structuredPattern);

    if (match) {
      const [_, firstBracket, secondBracket, remainingText] = match;

      // 두 번째 대괄호가 'source-processId' 형태인지 확인
      const sourcePidPattern = /^([^-]+)-(.+)$/;
      const sourcePidMatch = secondBracket.match(sourcePidPattern);

      if (sourcePidMatch) {
        // 'source-processId' 형태인 경우
        const [_, source, _extractedProcessId] = sourcePidMatch;
        return {
          text: remainingText.trim(),
          source: source.trim(),
          processId: firstBracket.trim(),
        };
      }

      // 일반적인 [processId] [source] 형태인 경우
      return {
        text: remainingText.trim(),
        source: secondBracket.trim(),
        processId: firstBracket.trim(),
      };
    }

    // 구조화된 형태가 아닌 경우 원본 문자열 반환
    return { text: argStr };
  }

  /**
   * 로그 항목을 배열에 추가
   * 
   * 새로운 로그 항목을 생성하여 메모리에 저장하고,
   * 실시간 스트리밍을 위한 이벤트를 발생시킵니다.
   * 
   * @param {'info' | 'error' | 'warn' | 'debug'} type - 로그 레벨
   * @param {string} source - 로그 소스
   * @param {string} message - 로그 메시지
   * @param {string} [processId] - 프로세스 ID (선택사항)
   */
  private addLog(
    type: 'info' | 'error' | 'warn' | 'debug',
    source: string,
    message: string,
    processId?: string,
  ) {
    const log: LogEntry = {
      timestamp: Date.now(),
      type,
      source,
      message,
      processId: processId || this.mainProcessId,
    };

    this.logs.push(log);

    // 메모리에 보관할 로그 수 제한
    if (this.logs.length > MAX_LOGS) {
      this.logs.shift();
    }

    // SSE 구독자들에게 로그 이벤트 발생
    this.logEmitter.emit('log', log);
  }

  /**
   * 모든 로그 조회
   * 
   * 현재 메모리에 저장된 모든 로그 항목을 반환합니다.
   * 
   * @returns {LogEntry[]} 로그 항목 배열
   */
  public getLogs(): LogEntry[] {
    return this.logs;
  }

  /**
   * 로그 이벤트 구독
   * 
   * 새로운 로그가 생성될 때마다 호출될 콜백 함수를 등록합니다.
   * 실시간 로그 스트리밍에 사용됩니다.
   * 
   * @param {(log: LogEntry) => void} callback - 새 로그 발생 시 호출될 콜백
   * @returns {() => void} 구독 해제 함수
   */
  public subscribe(callback: (log: LogEntry) => void): () => void {
    this.logEmitter.on('log', callback);
    return () => {
      this.logEmitter.off('log', callback);
    };
  }

  /**
   * 모든 로그 삭제
   * 
   * 메모리에 저장된 모든 로그를 삭제하고 'clear' 이벤트를 발생시킵니다.
   */
  public clearLogs(): void {
    this.logs = [];
    this.logEmitter.emit('clear');
  }
}

/**
 * 싱글톤 로그 서비스 인스턴스
 * 애플리케이션 전체에서 하나의 로그 서비스 인스턴스를 공유합니다.
 */
const logService = new LogService();
export default logService;
