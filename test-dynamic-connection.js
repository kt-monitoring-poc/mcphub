import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function testDynamicConnection() {
  try {
    console.log('🧪 동적 연결 시스템 테스트 시작...\n');
    
    // 실제 Firecrawl API Key 사용
    const actualFirecrawlKey = 'fc-89c11d9ad6ab4636bbfdfff9731d0972';
    
    // Firecrawl MCP 서버 URL 생성 (올바른 템플릿 사용)
    const firecrawlUrl = `https://mcp.firecrawl.dev/${actualFirecrawlKey}/sse`;
    console.log('📡 Firecrawl MCP URL:', firecrawlUrl);
    
    // StreamableHTTPClientTransport 생성
    const transport = new StreamableHTTPClientTransport(firecrawlUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('🔧 Transport 생성 완료');
    
    // MCP Client 생성
    const client = new Client(
      {
        name: 'mcp-client-firecrawl-test',
        version: '1.0.0',
      },
      {
        capabilities: {
          prompts: {},
          resources: {},
          tools: {},
        },
      },
    );
    
    console.log('🔧 Client 생성 완료');
    
    // 연결 시도
    console.log('🔄 Firecrawl MCP 서버 연결 시도 중...');
    await client.connect(transport);
    console.log('✅ Firecrawl MCP 서버 연결 성공!');
    
    // 도구 목록 가져오기
    console.log('🔄 도구 목록 요청 중...');
    const tools = await client.listTools();
    console.log('✅ 도구 목록 가져오기 성공!');
    console.log('📋 사용 가능한 도구:', tools.tools?.map(t => t.name).join(', ') || '없음');
    
    // 연결 종료
    await client.close();
    console.log('🔌 연결 종료 완료');
    
    console.log('\n🎉 동적 연결 시스템 테스트 성공!');
    
  } catch (error) {
    console.error('❌ 동적 연결 시스템 테스트 실패:', error);
    console.log('\n💡 실제 Firecrawl API Key로 테스트해보세요.');
  }
}

testDynamicConnection(); 