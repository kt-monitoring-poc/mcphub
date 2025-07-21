import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import * as otelResources from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { trace, metrics, context } from '@opentelemetry/api';
import { logs } from '@opentelemetry/api-logs';

// OpenTelemetry 설정 타입 정의
interface OTelConfig {
  endpoint: string;
  serviceName: string;
  serviceVersion: string;
  serviceNamespace: string;
  tracesEnabled: boolean;
  metricsEnabled: boolean;
  logsEnabled: boolean;
  consoleEnabled: boolean;
  sampleRate: number;
  environment: string;
}

// 전역 설정 변수
let otelConfig: OTelConfig | null = null;

// API에서 OpenTelemetry 설정 로드
async function loadOTelConfig(): Promise<OTelConfig> {
  if (otelConfig !== null) {
    return otelConfig as OTelConfig;
  }

  try {
    const response = await fetch('/config/otel', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load OpenTelemetry config: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error('Invalid OpenTelemetry config response');
    }

    otelConfig = result.data as OTelConfig;
    console.log('OpenTelemetry config loaded:', otelConfig);
    return otelConfig;
  } catch (error) {
    console.warn('Failed to load OpenTelemetry config from API, using fallback:', error);
    
    // 폴백 설정
    otelConfig = {
      endpoint: 'http://collector-http.rnr-apps-01.4.217.129.211.nip.io:4318',
      serviceName: 'mcp-hub-frontend',
      serviceVersion: '1.0.0',
      serviceNamespace: 'mcphub',
      tracesEnabled: true,
      metricsEnabled: true,
      logsEnabled: true,
      consoleEnabled: true,
      sampleRate: 1.0,
      environment: 'development',
    };
    return otelConfig;
  }
}

// 전역 변수들 (초기화 후 설정됨)
let tracerProvider: WebTracerProvider;
let metricProvider: MeterProvider;
let loggerProvider: LoggerProvider;
let meter: any;
let logger: any;

// 커스텀 메트릭들 (초기화 후 설정됨)
let pageViewCounter: any;
let userActionCounter: any;
let apiCallDuration: any;
let errorCounter: any;
let pageLoadTimeHistogram: any;
let domContentLoadedTimeHistogram: any;
let firstContentfulPaintHistogram: any;

// 자동 계측 등록
function registerAutoInstrumentations(config: OTelConfig): void {
  registerInstrumentations({
    instrumentations: [
      getWebAutoInstrumentations({
        '@opentelemetry/instrumentation-document-load': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-user-interaction': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-fetch': {
          enabled: true,
          propagateTraceHeaderCorsUrls: [
            /^https?:\/\/localhost/,
            /^https?:\/\/.*\.mcphub\.com/,
            new RegExp(window.location.origin),
          ],
          clearTimingResources: true,
        },
        '@opentelemetry/instrumentation-xml-http-request': {
          enabled: true,
          propagateTraceHeaderCorsUrls: [
            /^https?:\/\/localhost/,
            /^https?:\/\/.*\.mcphub\.com/,
            new RegExp(window.location.origin),
          ],
          clearTimingResources: true,
        },
      }),
    ],
  });
}

// OpenTelemetry 초기화 함수
export async function initializeOpenTelemetry(): Promise<void> {
  try {
    // API에서 설정 로드
    console.log('Loading OpenTelemetry configuration...');
    const config = await loadOTelConfig();
    
    // 공통 리소스 정의
    const resource = (otelResources as any).resourceFromAttributes ? (otelResources as any).resourceFromAttributes({
      [SEMRESATTRS_SERVICE_NAME]: config.serviceName,
      [SEMRESATTRS_SERVICE_VERSION]: config.serviceVersion,
      environment: config.environment,
      'service.instance.id': crypto.randomUUID(),
      'service.namespace': config.serviceNamespace,
    }) : undefined;

    // OTLP 익스포터들 설정
    const traceExporter = new OTLPTraceExporter({
      // url: `${config.endpoint}/v1/traces`,
      url: `${config.endpoint}`,
      headers: {},
    });

    const metricExporter = new OTLPMetricExporter({
      // url: `${config.endpoint}/v1/metrics`,
      url: `${config.endpoint}`,
      headers: {},
    });

    const logExporter = new OTLPLogExporter({
      // url: `${config.endpoint}/v1/logs`,
      url: `${config.endpoint}`,
      headers: {},
    });

    // Tracer Provider 설정
    tracerProvider = new WebTracerProvider({
      resource,
      sampler: {
        shouldSample: () => ({
          decision: Math.random() < config.sampleRate ? 1 : 0, // SamplingDecision.RECORD_AND_SAMPLE : SamplingDecision.NOT_RECORD
          attributes: {},
        }),
      } as any,
    });

    if (config.tracesEnabled) {
      tracerProvider.addSpanProcessor(
        new BatchSpanProcessor(traceExporter, {
          maxQueueSize: 1000,
          maxExportBatchSize: 512,
          exportTimeoutMillis: 5000,
          scheduledDelayMillis: 500,
        })
      );
    }

    // Metrics Provider 설정
    const readers = [];
    if (config.metricsEnabled) {
      readers.push(
        new PeriodicExportingMetricReader({
          exporter: metricExporter as any, // 임시 해결책
          exportIntervalMillis: 30000,
          exportTimeoutMillis: 5000,
        })
      );
    }

    metricProvider = new MeterProvider({
      resource,
      readers,
    });

    // Logs Provider 설정
    loggerProvider = new LoggerProvider({
      resource,
    });

    if (config.logsEnabled) {
      loggerProvider.addLogRecordProcessor(
        new BatchLogRecordProcessor(logExporter, {
          maxQueueSize: 1000,
          maxExportBatchSize: 512,
          exportTimeoutMillis: 5000,
          scheduledDelayMillis: 1000,
        })
      );
    }

    // 글로벌 제공자 등록
    trace.setGlobalTracerProvider(tracerProvider);
    metrics.setGlobalMeterProvider(metricProvider);
    logs.setGlobalLoggerProvider(loggerProvider);

    // 제공자들 등록
    tracerProvider.register();

    // 메트릭 및 로거 인스턴스 생성
    meter = metrics.getMeter(config.serviceName, config.serviceVersion);
    logger = logs.getLogger(config.serviceName, config.serviceVersion);

    // 커스텀 메트릭 정의
    pageViewCounter = meter.createCounter('page_views', {
      description: 'Number of page views',
    });

    userActionCounter = meter.createCounter('user_actions', {
      description: 'Number of user actions',
    });

    apiCallDuration = meter.createHistogram('api_call_duration', {
      description: 'Duration of API calls in milliseconds',
      unit: 'ms',
    });

    errorCounter = meter.createCounter('frontend_errors', {
      description: 'Number of frontend errors',
    });

    // 성능 메트릭 정의 (Histogram 사용)
    pageLoadTimeHistogram = meter.createHistogram('page_load_time', {
      description: 'Page load time in milliseconds',
      unit: 'ms',
    });

    domContentLoadedTimeHistogram = meter.createHistogram('dom_content_loaded_time', {
      description: 'DOM content loaded time in milliseconds',
      unit: 'ms',
    });

    firstContentfulPaintHistogram = meter.createHistogram('first_contentful_paint', {
      description: 'First contentful paint time in milliseconds',
      unit: 'ms',
    });
    
    // 자동 계측 등록
    registerAutoInstrumentations(config);
    
    console.log('OpenTelemetry initialized successfully with config:', {
      endpoint: config.endpoint,
      serviceName: config.serviceName,
      tracesEnabled: config.tracesEnabled,
      metricsEnabled: config.metricsEnabled,
      logsEnabled: config.logsEnabled,
    });
    
    // 초기화 과정을 트레이스로 감싸기
    const tracer = trace.getTracer(config.serviceName, config.serviceVersion);
    const initSpan = tracer.startSpan('frontend-initialization', {
      attributes: {
        'service.name': config.serviceName,
        'service.version': config.serviceVersion,
        'url': window.location.href,
        'user_agent': navigator.userAgent,
      },
    });
    
    // 스팬 컨텍스트 내에서 메트릭과 로그 기록
    const spanContext = trace.setSpan(context.active(), initSpan);
    
    context.with(spanContext, () => {
      // 초기 메트릭 기록
      if (pageViewCounter) {
        pageViewCounter.add(1, {
          page: window.location.pathname,
          userAgent: navigator.userAgent,
        });
      }
      
      // 초기 로그 기록 (이제 활성 스팬 컨텍스트 내에서)
      if (logger) {
        logger.emit({
          severityText: 'INFO',
          body: 'OpenTelemetry initialized',
          attributes: {
            component: 'telemetry',
            action: 'initialization',
            url: window.location.href,
            endpoint: config.endpoint,
          },
        });
      }
    });
    
    // 초기화 스팬 종료
    initSpan.addEvent('OpenTelemetry initialization completed');
    initSpan.setStatus({ code: 1 }); // OK
    initSpan.end();
    
  } catch (error) {
    console.error('Failed to initialize OpenTelemetry:', error);
    
    // 에러 메트릭 기록 (가능한 경우)
    if (errorCounter) {
      errorCounter.add(1, {
        error_type: 'initialization_error',
        component: 'telemetry',
      });
    }
    
    // 에러 로그 기록 (가능한 경우)
    if (logger) {
      logger.emit({
        severityText: 'ERROR',
        body: `Failed to initialize OpenTelemetry: ${error}`,
        attributes: {
          component: 'telemetry',
          action: 'initialization',
          error: String(error),
        },
      });
    }
  }
}

// 유틸리티 함수들
export function trackPageView(pageName: string, additionalAttributes: Record<string, string> = {}): void {
  if (!pageViewCounter) return;
  
  pageViewCounter.add(1, {
    page: pageName,
    url: window.location.pathname,
    ...additionalAttributes,
  });
  
  if (logger) {
    logger.emit({
      severityText: 'INFO',
      body: `Page view: ${pageName}`,
      attributes: {
        component: 'navigation',
        page: pageName,
        url: window.location.pathname,
        ...additionalAttributes,
      },
    });
  }
}

export function trackUserAction(action: string, component: string, additionalAttributes: Record<string, string> = {}): void {
  if (!userActionCounter) return;
  
  userActionCounter.add(1, {
    action,
    component,
    ...additionalAttributes,
  });
  
  if (logger) {
    logger.emit({
      severityText: 'INFO',
      body: `User action: ${action} in ${component}`,
      attributes: {
        component,
        action,
        user_action: action,
        ...additionalAttributes,
      },
    });
  }
}

export function trackApiCall(method: string, endpoint: string, duration: number, status: number, additionalAttributes: Record<string, string> = {}): void {
  if (!apiCallDuration) return;
  
  apiCallDuration.record(duration, {
    method,
    endpoint,
    status: status.toString(),
    ...additionalAttributes,
  });
  
  const severityText = status >= 400 ? 'ERROR' : 'INFO';
  
  if (logger) {
    logger.emit({
      severityText,
      body: `API call: ${method} ${endpoint} - ${status} (${duration}ms)`,
      attributes: {
        component: 'api',
        method,
        endpoint,
        status: status.toString(),
        duration: duration.toString(),
        ...additionalAttributes,
      },
    });
  }
}

export function trackError(error: Error, component: string, context: Record<string, string> = {}): void {
  if (errorCounter) {
    errorCounter.add(1, {
      error_type: error.name,
      component,
      ...context,
    });
  }
  
  if (logger) {
    logger.emit({
      severityText: 'ERROR',
      body: `Error in ${component}: ${error.message}`,
      attributes: {
        component,
        error_name: error.name,
        error_message: error.message,
        error_stack: error.stack || '',
        ...context,
      },
    });
  }
}

// 성능 모니터링
export function trackPerformance(): void {
  if (!pageLoadTimeHistogram || !domContentLoadedTimeHistogram || !firstContentfulPaintHistogram) return;
  
  if ('performance' in window && 'getEntriesByType' in performance) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      const loadTime = navigation.loadEventEnd - navigation.fetchStart;
      const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
      const firstContentfulPaint = performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0;
      
      // 성능 메트릭 기록
      pageLoadTimeHistogram.record(loadTime, { 
        page: window.location.pathname 
      });
      
      domContentLoadedTimeHistogram.record(domContentLoaded, { 
        page: window.location.pathname 
      });
      
      if (firstContentfulPaint > 0) {
        firstContentfulPaintHistogram.record(firstContentfulPaint, { 
          page: window.location.pathname 
        });
      }
      
      // 성능 로그 기록
      if (logger) {
        logger.emit({
          severityText: 'INFO',
          body: 'Performance metrics collected',
          attributes: {
            component: 'performance',
            page_load_time: loadTime.toString(),
            dom_content_loaded_time: domContentLoaded.toString(),
            first_contentful_paint: firstContentfulPaint.toString(),
            page: window.location.pathname,
          },
        });
      }
    }
  }
}

// 정리 함수
export async function shutdownOpenTelemetry(): Promise<void> {
  try {
    if (tracerProvider) await tracerProvider.shutdown();
    if (metricProvider) await metricProvider.shutdown();
    if (loggerProvider) await loggerProvider.shutdown();
    console.log('OpenTelemetry shut down successfully');
  } catch (error) {
    console.error('Error shutting down OpenTelemetry:', error);
  }
}

// 에러 리스너 설정
window.addEventListener('error', (event) => {
  trackError(new Error(event.message), 'global', {
    filename: event.filename,
    lineno: event.lineno?.toString() || '',
    colno: event.colno?.toString() || '',
  });
});

window.addEventListener('unhandledrejection', (event) => {
  trackError(new Error(event.reason), 'global', {
    type: 'unhandled_promise_rejection',
  });
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
  shutdownOpenTelemetry().catch(console.error);
}); 