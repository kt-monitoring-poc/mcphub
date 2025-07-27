import fetch from 'node-fetch';

async function testFirecrawlAlternative() {
  const apiKey = 'fc-89c11d9ad6ab4636bbfdfff9731d0972';
  
  console.log('🧪 Firecrawl MCP 서버 대안 URL 테스트\n');
  
  // 다른 가능한 URL 형식들
  const alternativeEndpoints = [
    `https://mcp.firecrawl.dev/sse/${apiKey}`,
    `https://mcp.firecrawl.dev/api/${apiKey}`,
    `https://mcp.firecrawl.dev/api/${apiKey}/sse`,
    `https://mcp.firecrawl.dev/v1/${apiKey}/sse`,
    `https://mcp.firecrawl.dev/v1/mcp/${apiKey}/sse`,
    `https://mcp.firecrawl.dev/mcp/v1/${apiKey}/sse`,
    `https://mcp.firecrawl.dev/stream/${apiKey}`,
    `https://mcp.firecrawl.dev/stream/${apiKey}/sse`,
  ];
  
  for (const endpoint of alternativeEndpoints) {
    try {
      console.log(`🔍 테스트 중: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            clientInfo: {
              name: 'test-client',
              version: '1.0.0'
            }
          }
        })
      });
      
      console.log(`   상태: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.text();
        console.log(`   ✅ 성공! 응답: ${data.substring(0, 100)}...`);
        console.log(`\n🎉 올바른 엔드포인트 발견: ${endpoint}`);
        break;
      } else if (response.status === 405) {
        console.log(`   ⚠️ Method Not Allowed - GET 요청 시도`);
        // GET 요청도 시도해보기
        try {
          const getResponse = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });
          console.log(`   GET 상태: ${getResponse.status} ${getResponse.statusText}`);
        } catch (getError) {
          console.log(`   GET 오류: ${getError.message}`);
        }
      } else {
        console.log(`   ❌ 실패`);
      }
      
    } catch (error) {
      console.log(`   ❌ 오류: ${error.message}`);
    }
    
    console.log('');
  }
}

testFirecrawlAlternative(); 