import pg from 'pg';
const { Client } = pg;

async function updateFirecrawlTokenName() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://jungchihoon@localhost:5432/mcphub'
  });

  try {
    await client.connect();
    console.log('✅ 데이터베이스 연결 성공\n');

    // jungchihoon 사용자의 MCPHub Key 업데이트
    const keyId = 'd3d1df0e-88d6-4ad8-af10-425a305a5473';

    // 기존 FIRECRAWL_API_KEY 값을 FIRECRAWL_TOKEN으로 이동
    const updateResult = await client.query(
      `UPDATE mcphub_keys
       SET "serviceTokens" = jsonb_build_object(
         'FIRECRAWL_TOKEN', "serviceTokens"->>'FIRECRAWL_API_KEY',
         'GITHUB_TOKEN', COALESCE("serviceTokens"->>'GITHUB_TOKEN', ''),
         'OPENAI_API_KEY', COALESCE("serviceTokens"->>'OPENAI_API_KEY', ''),
         'ANTHROPIC_API_KEY', COALESCE("serviceTokens"->>'ANTHROPIC_API_KEY', ''),
         'UPSTASH_REST_API_URL', COALESCE("serviceTokens"->>'UPSTASH_REST_API_URL', ''),
         'UPSTASH_REST_API_TOKEN', COALESCE("serviceTokens"->>'UPSTASH_REST_API_TOKEN', '')
       )
       WHERE id = $1`,
      [keyId]
    );

    if (updateResult.rowCount > 0) {
      console.log('✅ Firecrawl API Key 이름이 FIRECRAWL_TOKEN으로 변경되었습니다.');
      
      // 변경된 결과 확인
      const checkResult = await client.query(
        `SELECT "serviceTokens" FROM mcphub_keys WHERE id = $1`,
        [keyId]
      );
      
      if (checkResult.rows.length > 0) {
        const tokens = checkResult.rows[0].serviceTokens;
        console.log('🔑 업데이트된 Service Tokens:', tokens);
        
        if (tokens.FIRECRAWL_TOKEN) {
          console.log('🔥 Firecrawl Token:', tokens.FIRECRAWL_TOKEN.substring(0, 10) + '...');
        }
      }
    } else {
      console.log('❌ MCPHub Key를 찾을 수 없습니다.');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await client.end();
  }
}

updateFirecrawlTokenName(); 