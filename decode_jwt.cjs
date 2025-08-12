const jwt = require('jsonwebtoken');

// JWT 토큰을 디코딩하는 함수 (검증 없이)
function decodeJWT(token) {
  try {
    const decoded = jwt.decode(token, { complete: true });
    console.log('=== JWT Header ===');
    console.log(JSON.stringify(decoded.header, null, 2));
    console.log('\n=== JWT Payload ===');
    console.log(JSON.stringify(decoded.payload, null, 2));
    return decoded.payload;
  } catch (error) {
    console.error('JWT 디코딩 실패:', error.message);
    return null;
  }
}

// 명령행 인자에서 토큰 받기
const token = process.argv[2];
if (!token) {
  console.log('사용법: node decode_jwt.js <JWT_TOKEN>');
  process.exit(1);
}

decodeJWT(token);
