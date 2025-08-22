#!/bin/bash

NPM_REGISTRY=${NPM_REGISTRY:-https://registry.npmjs.org/}
echo "Setting npm registry to ${NPM_REGISTRY}"
npm config set registry "$NPM_REGISTRY"

# HTTP_PROXY 및 HTTPS_PROXY 환경변수 처리
if [ -n "$HTTP_PROXY" ]; then
  echo "Setting HTTP proxy to ${HTTP_PROXY}"
  npm config set proxy "$HTTP_PROXY"
  export HTTP_PROXY="$HTTP_PROXY"
fi

if [ -n "$HTTPS_PROXY" ]; then
  echo "Setting HTTPS proxy to ${HTTPS_PROXY}"
  npm config set https-proxy "$HTTPS_PROXY"
  export HTTPS_PROXY="$HTTPS_PROXY"
fi

echo "Using REQUEST_TIMEOUT: $REQUEST_TIMEOUT"

# OpenTelemetry 설정 확인 및 활성화 (런타임에만)
if [ "$OTEL_ENABLED" = "true" ]; then
  echo "OpenTelemetry enabled with endpoint: $OTEL_EXPORTER_OTLP_ENDPOINT"
  echo "Service name: $OTEL_SERVICE_NAME"
  # 런타임에 NODE_OPTIONS 설정
  export NODE_OPTIONS="--require @opentelemetry/auto-instrumentations-node/register"
  echo "NODE_OPTIONS set to: $NODE_OPTIONS"
else
  echo "OpenTelemetry disabled"
fi

exec "$@"