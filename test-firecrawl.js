import pg from 'pg';
const { Client } = pg;

async function testFirecrawl() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://jungchihoon@localhost:5432/mcphub'
  });

  try {
    await client.connect();
    console.log('✅ 데이터베이스 연결 성공\n');

    // jungchihoon 사용자의 MCPHub Key 조회
    const keyResult = await client.query(
      `SELECT k.id, k."serviceTokens" 
       FROM mcphub_keys k 
       JOIN users u ON k."userId" = u.id 
       WHERE u."githubUsername" = 'jungchihoon' AND k."isActive" = true`
    );

    if (keyResult.rows.length > 0) {
      const key = keyResult.rows[0];
      console.log('🔑 MCPHub Key ID:', key.id);

      if (key.serviceTokens && key.serviceTokens.FIRECRAWL_TOKEN) {
        const firecrawlKey = key.serviceTokens.FIRECRAWL_TOKEN;
        console.log('🔥 Firecrawl API Key:', firecrawlKey.substring(0, 10) + '...');

        // Firecrawl MCP 서버 URL 생성
        const firecrawlUrl = `https://mcp.firecrawl.dev/${firecrawlKey}/sse`;
        console.log('📡 Firecrawl MCP URL:', firecrawlUrl);

        console.log('\n이제 이 정보로 MCP 서버에 연결할 수 있습니다!');
      } else {
        console.log('❌ Firecrawl API Key가 설정되지 않았습니다.');
        console.log('Settings > API Keys에서 FIRECRAWL_TOKEN을 입력해주세요.');
      }
    } else {
      console.log('❌ 활성화된 MCPHub Key를 찾을 수 없습니다.');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await client.end();
  }
}

testFirecrawl(); 