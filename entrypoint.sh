#!/bin/bash

NPM_REGISTRY=${NPM_REGISTRY:-https://registry.npmjs.org/}
echo "Setting npm registry to ${NPM_REGISTRY}"
npm config set registry "$NPM_REGISTRY"

# 处理 HTTP_PROXY 和 HTTPS_PROXY 环境变量
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

# NODE_OPTIONS가 설정되어 있으면 명시적으로 적용
if [ -n "$NODE_OPTIONS" ]; then
  echo "Applying NODE_OPTIONS: $NODE_OPTIONS"
  # pnpm start 명령어를 node로 직접 실행하여 NODE_OPTIONS 적용
  if [ "$1" = "pnpm" ] && [ "$2" = "start" ]; then
    echo "Starting with OpenTelemetry auto-instrumentation..."
    exec node $NODE_OPTIONS dist/index.js
  else
    exec "$@"
  fi
else
  exec "$@"
fi
