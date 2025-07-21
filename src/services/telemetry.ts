// Backend OpenTelemetry 설정 서비스 (환경변수 + 수동 트레이스)
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { trace, metrics } from '@opentelemetry/api';
import { logs } from '@opentelemetry/api-logs';
import os from 'os';

// 환경변수 헬퍼
function getEnvVar(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function parseBoolean(value: string): boolean {
  return value === 'true' || value === '1';
}

// OpenTelemetry 설정
const otelConfig = {
  enabled: parseBoolean(getEnvVar('OTEL_ENABLED', 'false')),
  service: {
    name: getEnvVar('OTEL_SERVICE_NAME', 'mcp-hub'),
    version: getEnvVar('OTEL_SERVICE_VERSION', '1.0.0'),
    namespace: getEnvVar('OTEL_SERVICE_NAMESPACE', 'mcphub'),
    instanceId: getEnvVar('OTEL_SERVICE_INSTANCE_ID', os.hostname()),
  },
  endpoint: getEnvVar('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://collector-http.rnr-apps-01.4.217.129.211.nip.io:4318'),
  traces: {
    enabled: parseBoolean(getEnvVar('OTEL_TRACES_ENABLED', 'true')),
  },
  metrics: {
    enabled: parseBoolean(getEnvVar('OTEL_METRICS_ENABLED', 'true')),
  },
  console: {
    enabled: parseBoolean(getEnvVar('OTEL_CONSOLE_ENABLED', 'true')),
  },
};

// Global telemetry instances
let meter: any;
let logger: any;
let requestCounter: any;
let serverUptimeGauge: any;
let dataGenerationInterval: NodeJS.Timeout | null = null;

// 메인 초기화 함수
export async function initializeOpenTelemetry() {
  if (!otelConfig.enabled) {
    console.log('🔕 OpenTelemetry 비활성화됨 (OTEL_ENABLED=false)');
    return;
  }

  console.log('🚀 OpenTelemetry 백엔드 초기화 중...');
  console.log(`📊 설정:
  - Service: ${otelConfig.service.name}@${otelConfig.service.version}
  - Environment: ${getEnvVar('NODE_ENV', 'development')}
  - OTLP Endpoint: ${otelConfig.endpoint}
  - Traces: ${otelConfig.traces.enabled ? '✅' : '❌'}
  - Metrics: ${otelConfig.metrics.enabled ? '✅' : '❌'}
  - Console: ${otelConfig.console.enabled ? '✅' : '❌'}`);

  try {
    // OpenTelemetry 환경변수 설정
    process.env.OTEL_SERVICE_NAME = otelConfig.service.name;
    process.env.OTEL_SERVICE_VERSION = otelConfig.service.version;
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = otelConfig.endpoint;
    console.log(`📊 모든 텔레메트리 데이터 → Collector 1: ${otelConfig.endpoint}`);

    // process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = `${otelConfig.endpoint}/v1/traces`;
    // process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT = `${otelConfig.endpoint}/v1/metrics`;
    // process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = `${otelConfig.endpoint}/v1/logs`;
    
    // Resource attributes 설정
    process.env.OTEL_RESOURCE_ATTRIBUTES = [
      `service.name=${otelConfig.service.name}`,
      `service.version=${otelConfig.service.version}`,
      `service.namespace=${otelConfig.service.namespace}`,
      `service.instance.id=${otelConfig.service.instanceId}`,
      `deployment.environment=${getEnvVar('NODE_ENV', 'development')}`,
      `host.name=${os.hostname()}`,
      `process.pid=${process.pid}`,
      `telemetry.sdk.language=nodejs`
    ].join(',');

    // SDK 활성화
    process.env.OTEL_SDK_DISABLED = 'false';
    if (otelConfig.traces.enabled) {
      process.env.OTEL_TRACES_EXPORTER = 'otlp';
    }
    if (otelConfig.metrics.enabled) {
      process.env.OTEL_METRICS_EXPORTER = 'otlp';
    }
    process.env.OTEL_LOGS_EXPORTER = 'otlp';

    // Auto-instrumentations 등록
    const instrumentations = getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-express': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
      '@opentelemetry/instrumentation-dns': {
        enabled: false,
      },
    });

    registerInstrumentations({
      instrumentations,
    });

    // Metrics 초기화
    if (otelConfig.metrics.enabled) {
      meter = metrics.getMeter(otelConfig.service.name, otelConfig.service.version);
      
      // HTTP 요청 카운터
      requestCounter = meter.createCounter('http_requests_total', {
        description: 'Total number of HTTP requests',
        unit: '1'
      });

      // 서버 가동시간 게이지
      serverUptimeGauge = meter.createUpDownCounter('server_uptime_seconds', {
        description: 'Server uptime in seconds',
        unit: 's'
      });

      console.log('✅ 백엔드 Metrics 초기화 완료');
    }

    // Logs 초기화  
    logger = logs.getLogger(otelConfig.service.name, otelConfig.service.version);
    console.log('✅ 백엔드 Logs 초기화 완료');
    
    console.log('✅ OpenTelemetry 환경변수 및 Auto-Instrumentations 설정 완료');
    console.log('🎉 OpenTelemetry 백엔드 E2E 모니터링 설정 성공!');
    console.log('📋 포함된 데이터: Traces ✅ | Metrics ✅ | Logs ✅');
    
    // 수동 테스트 트레이스 생성 (초기화 확인)
    setTimeout(() => {
    //   createManualTestTrace();
      startDataGeneration();
    }, 3000);
    
  } catch (error) {
    console.error('❌ OpenTelemetry 초기화 실패:', error);
  }
}

// 정기적인 데이터 생성 시작
function startDataGeneration() {
  if (dataGenerationInterval) return;

  console.log('🔄 백엔드 데이터 생성 시작 (30초 간격)');
  
  // 즉시 한 번 실행
  generateBackendData();
  
  // 30초마다 실행
  dataGenerationInterval = setInterval(() => {
    generateBackendData();
  }, 30000);
}

// 백엔드 메트릭, 로그 및 트레이스 생성
function generateBackendData() {
  try {
    const tracer = trace.getTracer(otelConfig.service.name, otelConfig.service.version);
    
    // 스팬 컨텍스트 내에서 메트릭과 로그 생성
    const span = tracer.startSpan('backend-data-generation');
    span.setAttributes({
      'service.name': otelConfig.service.name,
      'data.type': 'periodic',
      'backend.language': 'nodejs',
    });

    // 메트릭 생성
    if (requestCounter && serverUptimeGauge) {
      // HTTP 요청 시뮬레이션
      requestCounter.add(1, {
        method: 'GET',
        status_code: '200',
        endpoint: '/api/health'
      });

      // 서버 가동시간 업데이트
      const uptimeSeconds = Math.floor(process.uptime());
      serverUptimeGauge.add(uptimeSeconds, {
        service: otelConfig.service.name,
        environment: getEnvVar('NODE_ENV', 'development')
      });

      console.log(`📊 백엔드 메트릭 생성: requests=${1}, uptime=${uptimeSeconds}s`);
    }

    // 로그 생성
    if (logger) {
      const logRecord = {
        timestamp: Date.now() * 1000000, // nanoseconds
        severityNumber: 9, // INFO level
        severityText: 'INFO',
        body: 'Backend telemetry data generated',
        attributes: {
          'service.name': otelConfig.service.name,
          'log.source': 'backend',
          'backend.language': 'nodejs',
          'data.type': 'periodic',
          'timestamp': new Date().toISOString(),
        }
      };

      logger.emit(logRecord);
      console.log('📝 백엔드 로그 생성 완료');
    }

    span.addEvent('Backend data generation completed');
    span.end();

  } catch (error) {
    console.error('❌ 백엔드 데이터 생성 실패:', error);
  }
}

// 수동 테스트 트레이스 생성
// function createManualTestTrace() {
//   try {
//     console.log('🧪 수동 테스트 트레이스 생성 시작');
    
//     const tracer = trace.getTracer(otelConfig.service.name, otelConfig.service.version);
    
//     const span = tracer.startSpan('manual-backend-test-trace');
//     span.setAttributes({
//       'service.name': otelConfig.service.name,
//       'test.type': 'manual',
//       'backend.language': 'nodejs',
//       'trace.source': 'backend',
//       'test.timestamp': new Date().toISOString(),
//     });
    
//     span.addEvent('Manual backend test trace created', {
//       'event.type': 'test',
//       'backend.initialized': true,
//     });
    
//     // 자식 스팬
//     const childSpan = tracer.startSpan('manual-child-operation');
//     childSpan.setAttributes({
//       'operation.name': 'child-test',
//       'operation.manual': true,
//     });
//     childSpan.addEvent('Child operation executed');
//     childSpan.end();
    
//     span.end();
    
//     console.log('✅ 수동 테스트 트레이스 생성 완료 - Collector에서 확인 가능');
    
//   } catch (error) {
//     console.error('❌ 수동 테스트 트레이스 생성 실패:', error);
//   }
// }

// HTTP 요청 트레이스 생성 함수 (Express 미들웨어에서 호출)
export function createHttpTrace(method: string, path: string, statusCode: number, duration?: number) {
  try {
    const tracer = trace.getTracer(otelConfig.service.name, otelConfig.service.version);
    
    const span = tracer.startSpan(`HTTP ${method} ${path}`);
    span.setAttributes({
      'http.method': method,
      'http.url': path,
      'http.status_code': statusCode,
      'service.name': otelConfig.service.name,
      'trace.source': 'backend',
      'trace.manual': true,
    });
    
    if (duration) {
      span.setAttributes({
        'http.duration_ms': duration,
      });
    }
    
    span.addEvent('HTTP request processed', {
      'http.method': method,
      'http.path': path,
      'http.status': statusCode,
    });
    
    span.end();
    
    console.log(`📊 HTTP 트레이스 생성: ${method} ${path} (${statusCode})`);

    // HTTP 요청 메트릭도 함께 기록
    if (requestCounter) {
      requestCounter.add(1, {
        method: method,
        status_code: statusCode.toString(),
        endpoint: path
      });
    }
    
  } catch (error) {
    console.error('❌ HTTP 트레이스 생성 실패:', error);
  }
}

// 정리 함수
export async function shutdown() {
  if (dataGenerationInterval) {
    clearInterval(dataGenerationInterval);
    dataGenerationInterval = null;
  }
  console.log('🛑 OpenTelemetry 정리 완료');
}

// 모듈 로드 시 자동 초기화
initializeOpenTelemetry(); 