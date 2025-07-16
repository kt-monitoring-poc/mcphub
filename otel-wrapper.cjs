// OpenTelemetry 통합 설정 및 초기화
const { NodeSDK } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-otlp-http');
const { OTLPLogExporter } = require('@opentelemetry/exporter-otlp-http');
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-node');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs');
const { trace, metrics, logs } = require('@opentelemetry/api');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🚀 OpenTelemetry 통합 초기화 중...');

// 환경변수 기본값 설정
function getEnvVar(key, defaultValue) {
  return process.env[key] || defaultValue;
}

// 설정 파일 로드 및 환경변수 치환
function loadConfig() {
  try {
    const configPath = path.join(__dirname, 'otel-config.json');
    const configFile = fs.readFileSync(configPath, 'utf8');
    
    // 환경변수 치환
    const configWithEnv = configFile.replace(/\$\{([^}]+)\}/g, (match, envVar) => {
      const [key, defaultValue] = envVar.split(':-');
      return getEnvVar(key, defaultValue || '');
    });
    
    return JSON.parse(configWithEnv);
  } catch (error) {
    console.warn('⚠️  otel-config.json 로드 실패, 기본 설정 사용:', error.message);
    return getDefaultConfig();
  }
}

// 기본 설정
function getDefaultConfig() {
  return {
    service: {
      name: getEnvVar('OTEL_SERVICE_NAME', 'mcp-hub'),
      version: getEnvVar('OTEL_SERVICE_VERSION', '1.0.0'),
      namespace: getEnvVar('OTEL_SERVICE_NAMESPACE', 'mcphub')
    },
    tracing: {
      enabled: getEnvVar('OTEL_TRACES_ENABLED', 'true') === 'true',
      exporter: {
        otlp: {
          endpoint: getEnvVar('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://localhost:4318')
        }
      }
    },
    metrics: {
      enabled: getEnvVar('OTEL_METRICS_ENABLED', 'true') === 'true',
      exporter: {
        otlp: {
          endpoint: getEnvVar('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://localhost:4318')
        }
      },
      reader: {
        interval: 60000,
        timeout: 30000
      }
    },
    logs: {
      enabled: getEnvVar('OTEL_LOGS_ENABLED', 'true') === 'true',
      exporter: {
        otlp: {
          endpoint: getEnvVar('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://localhost:4318')
        }
      },
      processor: {
        batch: {
          maxExportBatchSize: 512,
          maxQueueSize: 2048,
          exportTimeout: 30000,
          scheduleDelay: 1000
        }
      }
    },
    development: {
      enabled: getEnvVar('NODE_ENV', 'development') === 'development',
      console: {
        enabled: getEnvVar('OTEL_CONSOLE_ENABLED', 'true') === 'true'
      }
    }
  };
}

// 리소스 생성
function createResource(config) {
  const hostname = getEnvVar('HOSTNAME', require('os').hostname());
  
  return new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: config.service.name,
    [SemanticResourceAttributes.SERVICE_VERSION]: config.service.version,
    [SemanticResourceAttributes.SERVICE_NAMESPACE]: config.service.namespace,
    [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: config.service.instance || hostname,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: getEnvVar('NODE_ENV', 'development'),
    [SemanticResourceAttributes.HOST_NAME]: hostname,
    [SemanticResourceAttributes.PROCESS_PID]: process.pid.toString(),
    [SemanticResourceAttributes.PROCESS_EXECUTABLE_NAME]: 'node',
    [SemanticResourceAttributes.PROCESS_COMMAND]: process.argv.join(' ')
  });
}

// Trace Exporter 설정
function createTraceExporter(config) {
  const exporters = [];
  
  if (config.tracing.enabled) {
    // OTLP Exporter
    exporters.push(new OTLPTraceExporter({
      url: `${config.tracing.exporter.otlp.endpoint}/v1/traces`,
      headers: config.tracing.exporter.otlp.headers ? 
        Object.fromEntries(config.tracing.exporter.otlp.headers.split(',').map(h => h.split('='))) : {},
      timeoutMillis: parseInt(config.tracing.exporter.otlp.timeout) || 30000,
    }));
    
    // Console Exporter for development
    if (config.development.enabled && config.development.console.enabled) {
      exporters.push(new ConsoleSpanExporter());
    }
  }
  
  return exporters;
}

// Metric Reader 설정
function createMetricReader(config) {
  if (!config.metrics.enabled) return [];
  
  return [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `${config.metrics.exporter.otlp.endpoint}/v1/metrics`,
        headers: config.metrics.exporter.otlp.headers ? 
          Object.fromEntries(config.metrics.exporter.otlp.headers.split(',').map(h => h.split('='))) : {},
        timeoutMillis: parseInt(config.metrics.exporter.otlp.timeout) || 30000,
      }),
      exportIntervalMillis: parseInt(config.metrics.reader.interval) || 60000,
      exportTimeoutMillis: parseInt(config.metrics.reader.timeout) || 30000,
    })
  ];
}

// Log Processor 설정
function createLogProcessor(config) {
  if (!config.logs.enabled) return [];
  
  return [
    new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: `${config.logs.exporter.otlp.endpoint}/v1/logs`,
        headers: config.logs.exporter.otlp.headers ? 
          Object.fromEntries(config.logs.exporter.otlp.headers.split(',').map(h => h.split('='))) : {},
        timeoutMillis: parseInt(config.logs.exporter.otlp.timeout) || 30000,
      }),
      {
        maxExportBatchSize: parseInt(config.logs.processor.batch.maxExportBatchSize) || 512,
        maxQueueSize: parseInt(config.logs.processor.batch.maxQueueSize) || 2048,
        exportTimeoutMillis: parseInt(config.logs.processor.batch.exportTimeout) || 30000,
        scheduledDelayMillis: parseInt(config.logs.processor.batch.scheduleDelay) || 1000,
      }
    )
  ];
}

// OpenTelemetry 초기화
function initializeOpenTelemetry() {
  const config = loadConfig();
  const resource = createResource(config);
  
  console.log('📊 OpenTelemetry 설정:');
  console.log(`  - Service: ${config.service.name}@${config.service.version}`);
  console.log(`  - Environment: ${getEnvVar('NODE_ENV', 'development')}`);
  console.log(`  - OTLP Endpoint: ${config.tracing.exporter.otlp.endpoint}`);
  console.log(`  - Traces: ${config.tracing.enabled ? '✅' : '❌'}`);
  console.log(`  - Metrics: ${config.metrics.enabled ? '✅' : '❌'}`);
  console.log(`  - Logs: ${config.logs.enabled ? '✅' : '❌'}`);
  
  const sdk = new NodeSDK({
    resource,
    traceExporter: createTraceExporter(config),
    metricReader: createMetricReader(config),
    logRecordProcessor: createLogProcessor(config),
    instrumentations: [], // auto-instrumentations will be loaded
  });
  
  try {
    sdk.start();
    console.log('✅ OpenTelemetry SDK 초기화 완료');
    
    // 초기화 확인
    const tracer = trace.getTracer(config.service.name, config.service.version);
    const meter = metrics.getMeter(config.service.name, config.service.version);
    const logger = logs.getLogger(config.service.name, config.service.version);
    
    console.log('🎯 OpenTelemetry 컴포넌트 준비 완료');
    
    return sdk;
  } catch (error) {
    console.error('❌ OpenTelemetry 초기화 실패:', error);
    process.exit(1);
  }
}

// 애플리케이션 시작
function startApplication() {
  console.log('🎯 MCPHUB 애플리케이션 시작 중...');
  
  const app = spawn('node', ['dist/index.js'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      // OpenTelemetry 설정이 이미 완료되었음을 표시
      OTEL_SDK_DISABLED: 'false',
      OTEL_NODE_ENABLED_INSTRUMENTATIONS: 'http,https,express,fs,dns'
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
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM 신호 수신, 애플리케이션 종료 중...');
    app.kill('SIGTERM');
  });
  
  process.on('SIGINT', () => {
    console.log('SIGINT 신호 수신, 애플리케이션 종료 중...');
    app.kill('SIGINT');
  });
}

// 메인 실행
try {
  const sdk = initializeOpenTelemetry();
  startApplication();
} catch (error) {
  console.error('❌ 초기화 실패:', error);
  process.exit(1);
} 