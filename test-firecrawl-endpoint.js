import fetch from 'node-fetch';

async function testFirecrawlEndpoints() {
  const apiKey = 'fc-89c11d9ad6ab4636bbfdfff9731d0972';
  
  console.log('🧪 Firecrawl MCP 서버 엔드포인트 테스트\n');
  
  // 가능한 엔드포인트들
  const endpoints = [
    `https://mcp.firecrawl.dev/${apiKey}/sse`,
    `https://mcp.firecrawl.dev/${apiKey}`,
    `https://mcp.firecrawl.dev/sse/${apiKey}`,
    `https://mcp.firecrawl.dev/api/${apiKey}/sse`,
    `https://mcp.firecrawl.dev/mcp/${apiKey}/sse`,
  ];
  
  for (const endpoint of endpoints) {
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
        break;
      } else {
        console.log(`   ❌ 실패`);
      }
      
    } catch (error) {
      console.log(`   ❌ 오류: ${error.message}`);
    }
    
    console.log('');
  }
}

testFirecrawlEndpoints(); 