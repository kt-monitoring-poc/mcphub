/**
 * StreamableHTTPClientTransport를 래핑하여 mcp-session-id 헤더를 처리하는 클래스
 * 
 * streamable-http 서버와의 통신 시 응답 헤더에서 mcp-session-id를 추출하여 저장하고,
 * 이후 모든 요청에 해당 세션 ID를 포함하도록 합니다.
 */

import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export class StreamableHTTPClientTransportWrapper {
  private transport: StreamableHTTPClientTransport;
  private sessionId: string | null = null;
  private serverName: string;
  private originalFetch: typeof fetch;
  private sessionIdCallbacks: ((sessionId: string) => void)[] = [];

  constructor(url: URL, options: any, serverName: string) {
    this.serverName = serverName;
    
    // StreamableHTTPClientTransport 생성
    this.transport = new StreamableHTTPClientTransport(url, options);
    
    // transport의 내부 fetch 메서드를 직접 래핑
    this.wrapTransportFetch();
    
    console.log(`🔧 [${this.serverName}] 🔧 StreamableHTTPClientTransport 래퍼 생성 완료`);
  }

  /**
   * fetch 함수를 래핑하여 mcp-session-id 헤더 처리
   */
  private createWrappedFetch() {
    const self = this;
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
      // 요청 헤더 준비
      const requestHeaders = init?.headers ? 
        (init.headers instanceof Headers ? 
          Array.from(init.headers.entries()) : 
          (Array.isArray(init.headers) ? init.headers : Object.entries(init.headers))
        ) : [];
      
      console.log(`📤 [${this.serverName}] 📤 HTTP 요청 전송:`, {
        url: url,
        method: init?.method || 'GET',
        headers: requestHeaders,
        sessionId: this.sessionId || '없음'
      });

      // 세션 ID가 있으면 요청 헤더에 추가
      if (this.sessionId) {
        if (!init) {
          init = {};
        }
        if (!init.headers) {
          init.headers = {};
        }
        
        // Headers 객체 처리
        if (init.headers instanceof Headers) {
          init.headers.set('mcp-session-id', this.sessionId);
        } else if (Array.isArray(init.headers)) {
          init.headers.push(['mcp-session-id', this.sessionId]);
        } else {
          init.headers['mcp-session-id'] = this.sessionId;
        }
        
        console.log(`📤 [${this.serverName}] 📤 요청에 mcp-session-id 헤더 추가: ${this.sessionId}`);
      }

      try {
        // 원본 fetch 호출 (globalThis.fetch 사용)
        const response = await globalThis.fetch(input, init);
        
        // 응답 헤더에서 mcp-session-id 추출 (대소문자 구분 없이)
        const responseSessionId = response.headers.get('mcp-session-id') || 
                                 response.headers.get('MCP-Session-ID') ||
                                 response.headers.get('MCP-SESSION-ID');
        
        // 모든 응답 헤더 로깅
        const allHeaders = Array.from(response.headers.entries());
        console.log(`📡 [${this.serverName}] 📡 HTTP 응답 수신:`, {
          url: url,
          status: response.status,
          statusText: response.statusText,
          headers: allHeaders,
          mcpSessionId: responseSessionId || '없음'
        });
        
        // mcp-session-id 처리
        if (responseSessionId && responseSessionId !== this.sessionId) {
          console.log(`🎯 [${this.serverName}] 🎯 새로운 mcp-session-id 발견!`);
          console.log(`📥 [${this.serverName}] 📥 세션 ID: ${responseSessionId}`);
          this.sessionId = responseSessionId;
          
          // 콜백 호출하여 세션 ID 변경 알림
          this.sessionIdCallbacks.forEach(callback => {
            try {
              callback(responseSessionId);
            } catch (error) {
              console.error(`❌ [${this.serverName}] 세션 ID 콜백 실행 중 오류:`, error);
            }
          });
        } else if (responseSessionId) {
          console.log(`✅ [${this.serverName}] ✅ 기존 세션 ID 유지: ${responseSessionId}`);
        } else {
          console.log(`⚠️ [${this.serverName}] ⚠️ mcp-session-id 헤더 없음`);
        }

        return response;
      } catch (error) {
        console.error(`❌ [${this.serverName}] HTTP 요청 실패:`, error);
        throw error;
      }
    };
  }

  /**
   * transport 내부의 fetch 메서드를 래핑
   */
  private wrapTransportFetch() {
    // transport 객체의 내부 구조에 접근
    const transportAny = this.transport as any;
    
    console.log(`🔍 [${this.serverName}] 🔍 transport 내부 구조 분석:`, {
      hasFetch: !!transportAny.fetch,
      hasFetchMethod: typeof transportAny.fetch === 'function',
      hasRequestInit: !!transportAny._requestInit,
      hasSessionId: !!transportAny._sessionId,
      sessionId: transportAny._sessionId || '없음',
      transportKeys: Object.keys(transportAny)
    });
    
    // transport의 _sessionId 속성을 모니터링
    if (transportAny._sessionId !== undefined) {
      // _sessionId 속성을 가로채서 변경을 감지
      let currentSessionId = transportAny._sessionId;
      
      Object.defineProperty(transportAny, '_sessionId', {
        get: () => currentSessionId,
        set: (newSessionId: string | null) => {
          if (newSessionId && newSessionId !== currentSessionId) {
            console.log(`🎯 [${this.serverName}] 🎯 transport._sessionId 변경 감지!`);
            console.log(`📥 [${this.serverName}] 📥 이전: ${currentSessionId || '없음'} → 새로운: ${newSessionId}`);
            
            // 래퍼의 sessionId도 업데이트
            this.sessionId = newSessionId;
            
            // 콜백 호출
            this.sessionIdCallbacks.forEach(callback => {
              try {
                callback(newSessionId);
              } catch (error) {
                console.error(`❌ [${this.serverName}] 세션 ID 콜백 실행 중 오류:`, error);
              }
            });
          }
          currentSessionId = newSessionId;
        },
        enumerable: true,
        configurable: true
      });
      
      console.log(`🎯 [${this.serverName}] 🎯 transport._sessionId 모니터링 시작`);
    }
    
    // transport의 fetch 메서드를 직접 래핑
    if (transportAny.fetch && typeof transportAny.fetch === 'function') {
      const originalFetch = transportAny.fetch;
      const wrappedFetch = this.createWrappedFetch();
      
      // fetch 메서드를 래핑된 버전으로 교체
      transportAny.fetch = wrappedFetch;
      
      console.log(`✅ [${this.serverName}] ✅ transport.fetch 메서드 래핑 완료`);
    } else {
      console.log(`⚠️ [${this.serverName}] ⚠️ transport.fetch 메서드를 찾을 수 없음`);
      
      // 대안: transport의 모든 메서드를 검사하여 fetch와 유사한 메서드 찾기
      for (const [key, value] of Object.entries(transportAny)) {
        if (typeof value === 'function' && key.toLowerCase().includes('fetch')) {
          console.log(`🔍 [${this.serverName}] 🔍 잠재적 fetch 메서드 발견: ${key}`);
        }
      }
    }
    
    // requestInit 옵션에 세션 ID 추가하는 로직
    if (transportAny._requestInit || transportAny.requestInit) {
      const originalRequestInit = transportAny._requestInit || transportAny.requestInit || {};
      
      // getter/setter로 동적으로 헤더 추가
      Object.defineProperty(transportAny, '_requestInit', {
        get: () => {
          const headers = {
            ...(originalRequestInit.headers || {}),
          };
          
          if (this.sessionId) {
            headers['mcp-session-id'] = this.sessionId;
          }
          
          return {
            ...originalRequestInit,
            headers
          };
        }
      });
    }
  }

  /**
   * 현재 세션 ID 반환
   */
  getSessionId(): string | null {
    // transport의 _sessionId를 우선적으로 확인
    const transportAny = this.transport as any;
    if (transportAny._sessionId) {
      console.log(`🎯 [${this.serverName}] 🎯 transport._sessionId에서 세션 ID 확인: ${transportAny._sessionId}`);
      return transportAny._sessionId;
    }
    
    // 래퍼의 sessionId 반환
    console.log(`🔍 [${this.serverName}] 🔍 래퍼 sessionId에서 세션 ID 확인: ${this.sessionId || '없음'}`);
    return this.sessionId;
  }

  /**
   * 세션 ID 수동 설정 (재연결 시 사용)
   */
  setSessionId(sessionId: string | null) {
    console.log(`🔧 [${this.serverName}] mcp-session-id 수동 설정: ${sessionId}`);
    this.sessionId = sessionId;
  }

  /**
   * 세션 ID 변경 콜백 등록
   */
  onSessionIdChange(callback: (sessionId: string) => void) {
    this.sessionIdCallbacks.push(callback);
    console.log(`📝 [${this.serverName}] 세션 ID 변경 콜백 등록됨 (총 ${this.sessionIdCallbacks.length}개)`);
  }

  /**
   * 세션 ID 변경 콜백 제거
   */
  removeSessionIdCallback(callback: (sessionId: string) => void) {
    const index = this.sessionIdCallbacks.indexOf(callback);
    if (index > -1) {
      this.sessionIdCallbacks.splice(index, 1);
      console.log(`🗑️ [${this.serverName}] 세션 ID 변경 콜백 제거됨 (남은 ${this.sessionIdCallbacks.length}개)`);
    }
  }

  /**
   * transport의 모든 속성과 메서드를 프록시하여 반환
   */
  asTransport(): any {
    const self = this;
    
    return new Proxy(this.transport, {
      get(target, prop, receiver) {
        // 래퍼의 특별한 메서드들
        if (prop === 'getSessionId') {
          return () => self.getSessionId();
        }
        if (prop === 'setSessionId') {
          return (sessionId: string | null) => self.setSessionId(sessionId);
        }
        if (prop === 'onSessionIdChange') {
          return (callback: (sessionId: string) => void) => self.onSessionIdChange(callback);
        }
        if (prop === 'removeSessionIdCallback') {
          return (callback: (sessionId: string) => void) => self.removeSessionIdCallback(callback);
        }
        
        // 원본 transport의 속성/메서드 반환
        const value = Reflect.get(target, prop, receiver);
        
        // 함수인 경우 this 바인딩 유지
        if (typeof value === 'function') {
          return value.bind(target);
        }
        
        return value;
      },
      
      // instanceof 체크를 위한 처리
      getPrototypeOf(target) {
        return StreamableHTTPClientTransport.prototype;
      },
      
      // constructor 체크를 위한 처리
      has(target, prop) {
        if (prop === Symbol.hasInstance) {
          return true;
        }
        return Reflect.has(target, prop);
      }
    });
  }
}