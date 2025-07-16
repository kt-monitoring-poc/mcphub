import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { trace, metrics } from '@opentelemetry/api';
import { logs } from '@opentelemetry/api-logs';

// 환경 변수에서 OTLP 엔드포인트 가져오기
const OTLP_ENDPOINT = import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

// 공통 리소스 정의
const resource = new Resource({
  [SEMRESATTRS_SERVICE_NAME]: 'mcphub-frontend',
  [SEMRESATTRS_SERVICE_VERSION]: '1.0.0',
  environment: import.meta.env.MODE || 'development',
  'service.instance.id': crypto.randomUUID(),
});

// OTLP 익스포터들 설정
const traceExporter = new OTLPTraceExporter({
  url: `${OTLP_ENDPOINT}/v1/traces`,
  headers: {},
});

const metricExporter = new OTLPMetricExporter({
  url: `${OTLP_ENDPOINT}/v1/metrics`,
  headers: {},
});

const logExporter = new OTLPLogExporter({
  url: `${OTLP_ENDPOINT}/v1/logs`,
  headers: {},
});

// Tracer Provider 설정
const tracerProvider = new WebTracerProvider({
  resource,
});

tracerProvider.addSpanProcessor(
  new BatchSpanProcessor(traceExporter, {
    maxQueueSize: 1000,
    maxExportBatchSize: 512,
    exportTimeoutMillis: 5000,
    scheduledDelayMillis: 500,
  })
);

// Metrics Provider 설정
const metricProvider = new MeterProvider({
  resource,
  readers: [
    new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 30000, // 30초마다 내보내기
      exportTimeoutMillis: 5000,
    }),
  ],
});

// Logs Provider 설정
const loggerProvider = new LoggerProvider({
  resource,
});

loggerProvider.addLogRecordProcessor(
  new BatchLogRecordProcessor(logExporter, {
    maxQueueSize: 1000,
    maxExportBatchSize: 512,
    exportTimeoutMillis: 5000,
    scheduledDelayMillis: 1000,
  })
);

// 글로벌 제공자 등록
trace.setGlobalTracerProvider(tracerProvider);
metrics.setGlobalMeterProvider(metricProvider);
logs.setGlobalLoggerProvider(loggerProvider);

// 메트릭 및 로거 인스턴스 생성
const meter = metrics.getMeter('mcphub-frontend', '1.0.0');
const logger = logs.getLogger('mcphub-frontend', '1.0.0');

// 커스텀 메트릭 정의
const pageViewCounter = meter.createCounter('page_views', {
  description: 'Number of page views',
});

const userActionCounter = meter.createCounter('user_actions', {
  description: 'Number of user actions',
});

const apiCallDuration = meter.createHistogram('api_call_duration', {
  description: 'Duration of API calls in milliseconds',
  unit: 'ms',
});

const errorCounter = meter.createCounter('frontend_errors', {
  description: 'Number of frontend errors',
});

// 성능 메트릭 정의 (Histogram 사용)
const pageLoadTimeHistogram = meter.createHistogram('page_load_time', {
  description: 'Page load time in milliseconds',
  unit: 'ms',
});

const domContentLoadedTimeHistogram = meter.createHistogram('dom_content_loaded_time', {
  description: 'DOM content loaded time in milliseconds',
  unit: 'ms',
});

const firstContentfulPaintHistogram = meter.createHistogram('first_contentful_paint', {
  description: 'First contentful paint time in milliseconds',
  unit: 'ms',
});

// 자동 계측 등록
function registerAutoInstrumentations(): void {
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
    // 제공자들 등록
    tracerProvider.register();
    
    // 자동 계측 등록
    registerAutoInstrumentations();
    
    console.log('OpenTelemetry initialized successfully');
    
    // 초기 메트릭 기록
    pageViewCounter.add(1, {
      page: window.location.pathname,
      userAgent: navigator.userAgent,
    });
    
    // 초기 로그 기록
    logger.emit({
      severityText: 'INFO',
      body: 'OpenTelemetry initialized',
      attributes: {
        component: 'telemetry',
        action: 'initialization',
        url: window.location.href,
      },
    });
    
  } catch (error) {
    console.error('Failed to initialize OpenTelemetry:', error);
    
    // 에러 메트릭 기록
    errorCounter.add(1, {
      error_type: 'initialization_error',
      component: 'telemetry',
    });
    
    // 에러 로그 기록
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

// 유틸리티 함수들
export function trackPageView(pageName: string, additionalAttributes: Record<string, string> = {}): void {
  pageViewCounter.add(1, {
    page: pageName,
    url: window.location.pathname,
    ...additionalAttributes,
  });
  
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

export function trackUserAction(action: string, component: string, additionalAttributes: Record<string, string> = {}): void {
  userActionCounter.add(1, {
    action,
    component,
    ...additionalAttributes,
  });
  
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

export function trackApiCall(method: string, endpoint: string, duration: number, status: number, additionalAttributes: Record<string, string> = {}): void {
  apiCallDuration.record(duration, {
    method,
    endpoint,
    status: status.toString(),
    ...additionalAttributes,
  });
  
  const severityText = status >= 400 ? 'ERROR' : 'INFO';
  
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

export function trackError(error: Error, component: string, context: Record<string, string> = {}): void {
  errorCounter.add(1, {
    error_type: error.name,
    component,
    ...context,
  });
  
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

// 성능 모니터링
export function trackPerformance(): void {
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

// 정리 함수
export async function shutdownOpenTelemetry(): Promise<void> {
  try {
    await tracerProvider.shutdown();
    await metricProvider.shutdown();
    await loggerProvider.shutdown();
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