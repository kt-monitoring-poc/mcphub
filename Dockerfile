FROM python:3.13-slim-bookworm AS base

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# 프록시 환경변수 (필요시)
ARG HTTP_PROXY=""
ARG HTTPS_PROXY=""
ENV HTTP_PROXY=$HTTP_PROXY
ENV HTTPS_PROXY=$HTTPS_PROXY

# Node.js 22.x 및 npm 설치 (분리)
RUN apt-get update
RUN apt-get install -y curl gnupg ca-certificates
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
RUN apt-get update
RUN apt-get install -y nodejs git
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# pnpm 설치
RUN npm install -g pnpm

# OpenTelemetry 글로벌 설치 (Agent 방식)
RUN npm install -g @opentelemetry/api @opentelemetry/auto-instrumentations-node

# OpenTelemetry 환경변수 설정
ENV NODE_PATH=/usr/lib/node_modules
ENV OTEL_SERVICE_NAME="mcp-hub"
ENV OTEL_TRACES_EXPORTER="otlp"
ENV OTEL_EXPORTER_OTLP_ENDPOINT="http://collector-opentelemetry-collector.otel-collector-rnr.svc.cluster.local:4318"

ARG REQUEST_TIMEOUT=60000
ENV REQUEST_TIMEOUT=$REQUEST_TIMEOUT

ARG BASE_PATH=""
ENV BASE_PATH=$BASE_PATH

ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN mkdir -p $PNPM_HOME && \
  pnpm add -g @amap/amap-maps-mcp-server @playwright/mcp@latest tavily-mcp@latest @modelcontextprotocol/server-github @modelcontextprotocol/server-slack

ARG INSTALL_EXT=false
RUN if [ "$INSTALL_EXT" = "true" ]; then \
  ARCH=$(uname -m); \
  if [ "$ARCH" = "x86_64" ]; then \
  npx -y playwright install --with-deps chrome; \
  else \
  echo "Skipping Chrome installation on non-amd64 architecture: $ARCH"; \
  fi; \
  fi

RUN uv tool install mcp-server-fetch

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install

COPY . .

# Download the latest servers.json from mcpm.sh and replace the existing file
RUN curl -s -f --connect-timeout 10 https://mcpm.sh/api/servers.json -o servers.json || echo "Failed to download servers.json, using bundled version"

RUN pnpm frontend:build && pnpm build

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY otel-wrapper.cjs /app/otel-wrapper.cjs
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "otel-wrapper.cjs"]
