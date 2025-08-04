import pg from 'pg';
const { Client } = pg;

async function addFirecrawlToJungchihoon() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://jungchihoon@localhost:5432/mcphub'
  });

  try {
    await client.connect();
    console.log('✅ 데이터베이스 연결 성공\n');

    // jungchihoon 사용자의 MCPHub Key 업데이트
    const keyId = 'd3d1df0e-88d6-4ad8-af10-425a305a5473';
    
    // 테스트용 Firecrawl API Key (실제 키로 교체 필요)
    const testFirecrawlKey = 'test_firecrawl_key_12345';
    
    const updateResult = await client.query(
      `UPDATE mcphub_keys 
       SET "serviceTokens" = jsonb_set(
         COALESCE("serviceTokens", '{}'::jsonb), 
         '{FIRECRAWL_API_KEY}', 
         $1::jsonb
       )
       WHERE id = $2`,
      [JSON.stringify(testFirecrawlKey), keyId]
    );

    if (updateResult.rowCount > 0) {
      console.log('✅ Firecrawl API Key가 jungchihoon 계정에 추가되었습니다.');
      console.log('🔑 테스트 키:', testFirecrawlKey);
      console.log('\n⚠️ 실제 Firecrawl API Key로 교체하려면 웹 UI에서 수정해주세요.');
    } else {
      console.log('❌ MCPHub Key를 찾을 수 없습니다.');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await client.end();
  }
}

addFirecrawlToJungchihoon(); 