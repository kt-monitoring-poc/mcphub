# GitHub MCP 서버 연결 문제 분석 및 해결 과정

> 🎯 **핵심 목표**: `chore/concurrency-test-docs-and-script` 브랜치와 `integration/github-session-merge-2025-08-12` 브랜치 간의 GitHub MCP 서버 연결 차이점 분석 및 해결

## 📋 개요

**문제 상황**: 
- `chore/concurrency-test-docs-and-script` 브랜치에서는 GitHub MCP 서버가 연결되지 않아 GitHub 관련 도구들이 보이지 않음
- `integration/github-session-merge-2025-08-12` 브랜치에서는 GitHub MCP 서버가 정상적으로 연결되어 GitHub 관련 도구들이 정상 작동

**분석 목적**: 두 브랜치 간의 차이점을 파악하고, `chore` 브랜치에서도 GitHub MCP 서버가 정상 작동하도록 수정

## 🔍 문제 분석 과정

### 1. 브랜치별 도구 목록 비교

#### `chore/concurrency-test-docs-and-script` 브랜치 (수정 전)
```bash
# GitHub 관련 도구 없음
"name":"resolve-library-id"
"name":"get-library-docs"
"name":"get_user_profile"  # Jira 도구
"name":"get_issue"         # Jira 도구
# ... Jira/Confluence 도구들만 존재
```

#### `integration/github-session-merge-2025-08-12` 브랜치
```bash
# GitHub 관련 도구들 정상 작동
"name":"create_pull_request"
"name":"get_pull_request_data"
"name":"get_pull_request_details"
"name":"get_pull_request_diff"
"name":"get_pull_request_comments"
"name":"get_pull_request_reviews"
"name":"get_pull_requests"
"name":"create_issue"
"name":"get_issue"
```

### 2. 설정 파일 차이점 분석

#### `mcp_settings.json` 비교

**`chore` 브랜치 (문제가 있던 버전)**:
```json
"github-pr-mcp-server": {
  "type": "streamable-http",
  "url": "https://github-pr-mcp-server.livelybeach-90f399a8.koreacentral.azurecontainerapps.io/mcp/",  // ❌ 끝에 슬래시(/)
  "enabled": true,
  "headers": {
    "Authorization": "Bearer ${GITHUB_TOKEN}"
  }
}
```

**`integration` 브랜치 (정상 작동 버전)**:
```json
"github-pr-mcp-server": {
  "type": "streamable-http",
  "url": "https://github-pr-mcp-server.livelybeach-90f399a8.koreacentral.azurecontainerapps.io/mcp",  // ✅ 슬래시 없음
  "enabled": true,
  "headers": {
    "Authorization": "Bearer ${GITHUB_TOKEN}"
  }
}
```

## 🚨 문제 원인

**핵심 문제**: GitHub MCP 서버 URL 끝에 있던 **trailing slash (`/`)** 

**기술적 설명**:
1. **URL 리다이렉트 문제**: GitHub MCP 서버가 `/mcp/` 경로로 요청을 받으면 307 Temporary Redirect로 `/mcp` 경로로 리다이렉트
2. **HTTP 헤더 손실**: 리다이렉트 과정에서 `Authorization` 헤더가 손실되거나 제대로 전달되지 않음
3. **인증 실패**: 인증 헤더가 없어서 GitHub MCP 서버가 연결을 거부하고 도구 목록을 제공하지 않음

## ✅ 해결 방법

### 1. URL 수정
```bash
# 문제가 있던 URL
"url": "https://github-pr-mcp-server.livelybeach-90f399a8.koreacentral.azurecontainerapps.io/mcp/"

# 수정된 URL
"url": "https://github-pr-mcp-server.livelybeach-90f399a8.koreacentral.azurecontainerapps.io/mcp"
```

### 2. 수정 명령어
```bash
# mcp_settings.json 파일에서 trailing slash 제거
git checkout chore/concurrency-test-docs-and-script
# mcp_settings.json 수정 후
git add mcp_settings.json
git commit -m "fix(mcp): remove trailing slash from GitHub MCP server URL to fix connection issue"
```

## 🧪 해결 검증

### 1. 수정 전 테스트
```bash
# chore 브랜치에서 GitHub 관련 도구 없음
curl -s -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer mcphub_..." \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | grep -i "github"
# 결과: GitHub 관련 도구 없음
```

### 2. 수정 후 테스트
```bash
# chore 브랜치에서 GitHub 관련 도구 정상 작동
curl -s -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer mcphub_..." \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | grep -i "github"
# 결과: GitHub 관련 도구들 정상 표시

# 실제 GitHub API 호출 테스트
curl -s -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer mcphub_..." \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "get_pull_requests", "arguments": {"owner": "jungchihoon", "repo": "mcphub", "limit": 3}}, "id": 1}'
# 결과: GitHub Pull Request 목록 정상 반환
```

## 📚 기술적 인사이트

### 1. HTTP 리다이렉트와 헤더 전달
- **307 Temporary Redirect**: POST 요청의 본문과 헤더를 유지하면서 리다이렉트
- **하지만 일부 프록시나 클라이언트에서 헤더 전달이 불완전할 수 있음**
- **MCP 프로토콜**: 인증 헤더가 정확히 전달되어야 서버 연결 가능

### 2. URL 정규화의 중요성
- **Trailing slash**: 웹 서버마다 다르게 처리될 수 있음
- **일관성**: 모든 MCP 서버 URL에서 동일한 패턴 사용 권장
- **테스트**: 설정 변경 후 반드시 실제 연결 테스트 필요

### 3. 환경변수 처리 시스템
- **`${GITHUB_TOKEN}` 템플릿**: DB에서 사용자별 토큰을 자동으로 가져와서 대체
- **사용자별 인증**: 각 사용자의 GitHub 토큰으로 개별 인증
- **동적 연결**: 사용자별로 다른 토큰으로 GitHub MCP 서버 연결

## 🔧 향후 예방책

### 1. URL 설정 표준화
```json
// ✅ 권장: 슬래시 없는 표준 형태
"url": "https://server.example.com/mcp"

// ❌ 피해야 할 형태
"url": "https://server.example.com/mcp/"
"url": "https://server.example.com/mcp//"
```

### 2. 설정 검증 프로세스
```bash
# 1. URL 설정 후 서버 재시작
# 2. tools/list로 도구 목록 확인
# 3. 실제 API 호출로 연결 상태 검증
# 4. 로그에서 연결 오류 확인
```

### 3. 자동화된 테스트
```bash
# GitHub MCP 서버 연결 상태 확인 스크립트
curl -s -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer $MCPHUB_KEY" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "get_pull_requests", "arguments": {"owner": "test", "repo": "test", "limit": 1}}, "id": 1}' | grep -q "error" && echo "연결 실패" || echo "연결 성공"
```

## 📊 결과 요약

| 항목 | 수정 전 | 수정 후 |
|------|----------|----------|
| **GitHub MCP 서버 연결** | ❌ 실패 | ✅ 성공 |
| **GitHub 도구 표시** | ❌ 없음 | ✅ 정상 |
| **Pull Request 조회** | ❌ 불가 | ✅ 정상 |
| **이슈 생성/조회** | ❌ 불가 | ✅ 정상 |
| **URL 형태** | `/mcp/` | `/mcp` |

## 🎯 결론

**문제의 핵심**: `mcp_settings.json`의 GitHub MCP 서버 URL에 있던 trailing slash (`/`)가 HTTP 리다이렉트 과정에서 인증 헤더 전달 문제를 일으켰음

**해결 방법**: URL에서 trailing slash 제거

**학습 포인트**: 
1. MCP 서버 URL 설정 시 trailing slash 사용 금지
2. 설정 변경 후 반드시 실제 연결 테스트 수행
3. HTTP 리다이렉트와 인증 헤더 전달의 관계 이해

**현재 상태**: `chore/concurrency-test-docs-and-script` 브랜치에서도 GitHub MCP 서버가 정상적으로 연결되어 모든 GitHub 관련 도구들이 정상 작동

---

**작성일**: 2025-08-12  
**작성자**: MCPHub 개발팀  
**관련 이슈**: GitHub MCP 서버 연결 실패 문제 해결  
**테스트 환경**: `chore/concurrency-test-docs-and-script` 브랜치
