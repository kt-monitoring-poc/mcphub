import pg from 'pg';
const { Client } = pg;

async function checkJungchihoonKeys() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://jungchihoon@localhost:5432/mcphub'
  });

  try {
    await client.connect();
    console.log('✅ 데이터베이스 연결 성공\n');

    // jungchihoon 사용자 정보 조회
    const userResult = await client.query(
      `SELECT id, "githubUsername", "isAdmin" 
       FROM users 
       WHERE "githubUsername" = 'jungchihoon'`
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log('👤 사용자 정보:', user);
      
      // jungchihoon 사용자의 MCPHub Keys 조회
      const keyResult = await client.query(
        `SELECT id, name, "serviceTokens", "expiresAt", "lastUsedAt", "isActive" 
         FROM mcphub_keys 
         WHERE "userId" = $1`,
        [user.id]
      );

      console.log(`\n🔑 MCPHub Keys (${keyResult.rows.length}개):`);
      keyResult.rows.forEach((key, index) => {
        console.log(`\n${index + 1}. Key ID: ${key.id}`);
        console.log(`   Name: ${key.name}`);
        console.log(`   Active: ${key.isActive}`);
        console.log(`   Service Tokens:`, key.serviceTokens);
      });
    } else {
      console.log('❌ jungchihoon 사용자를 찾을 수 없습니다.');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await client.end();
  }
}

checkJungchihoonKeys(); 