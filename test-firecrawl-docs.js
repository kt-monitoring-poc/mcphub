import fetch from 'node-fetch';

async function testFirecrawlDocs() {
  const apiKey = 'fc-89c11d9ad6ab4636bbfdfff9731d0972';
  
  console.log('🧪 Firecrawl MCP 서버 문서 확인\n');
  
  // Firecrawl 메인 도메인 확인
  try {
    console.log('🔍 Firecrawl 메인 도메인 확인 중...');
    const response = await fetch('https://firecrawl.dev');
    console.log(`   상태: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log('   ✅ Firecrawl 도메인 접근 가능');
    }
  } catch (error) {
    console.log(`   ❌ 오류: ${error.message}`);
  }
  
  // MCP 관련 엔드포인트들
  const mcpEndpoints = [
    `https://firecrawl.dev/mcp/${apiKey}`,
    `https://firecrawl.dev/api/mcp/${apiKey}`,
    `https://firecrawl.dev/mcp/${apiKey}/sse`,
    `https://firecrawl.dev/api/mcp/${apiKey}/sse`,
    `https://api.firecrawl.dev/mcp/${apiKey}`,
    `https://api.firecrawl.dev/mcp/${apiKey}/sse`,
  ];
  
  console.log('\n🔍 MCP 엔드포인트 테스트:');
  
  for (const endpoint of mcpEndpoints) {
    try {
      console.log(`\n🔍 테스트 중: ${endpoint}`);
      
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
      } else {
        console.log(`   ❌ 실패`);
      }
      
    } catch (error) {
      console.log(`   ❌ 오류: ${error.message}`);
    }
  }
}

testFirecrawlDocs(); 