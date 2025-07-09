// CommonJS 래퍼 - OpenTelemetry 초기화 후 ES modules 애플리케이션 시작
const { spawn } = require('child_process');

console.log('🚀 OpenTelemetry Agent 초기화 중...');

// OpenTelemetry 환경변수 확인
console.log('OTEL_SERVICE_NAME:', process.env.OTEL_SERVICE_NAME);
console.log('OTEL_EXPORTER_OTLP_ENDPOINT:', process.env.OTEL_EXPORTER_OTLP_ENDPOINT);

// ES modules 애플리케이션 시작 (OpenTelemetry auto-instrumentations과 함께)
console.log('🎯 MCPHUB 애플리케이션 시작 중...');

// NODE_OPTIONS로 auto-instrumentations 설정
const nodeOptions = '--require @opentelemetry/auto-instrumentations-node/register';

const app = spawn('node', ['dist/index.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: nodeOptions
  }
});

app.on('close', (code) => {
  console.log(`애플리케이션이 종료되었습니다. 코드: ${code}`);
  process.exit(code);
});

app.on('error', (error) => {
  console.error('애플리케이션 시작 오류:', error);
  process.exit(1);
}); 