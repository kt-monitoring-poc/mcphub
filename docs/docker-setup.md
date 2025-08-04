# MCPHub Docker 설치 및 실행 가이드

## 📋 개요

MCPHub v3.0.1은 Frontend/Backend 분리 아키텍처를 사용하며, Docker Compose를 통해 쉽게 배포할 수 있습니다.

## 🏗 아키텍처 구조

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Nginx)       │◄──►│   (Node.js)     │◄──►│  (PostgreSQL)   │
│   Port: 80      │    │   Port: 3000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 빠른 시작

### 1. 환경변수 설정

```bash
# .env 파일 생성
cp .env.example .env

# 필수 환경변수 수정
vim .env
```

**필수 설정 항목:**
- `GITHUB_CLIENT_ID`: GitHub OAuth 앱 클라이언트 ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth 앱 시크릿
- `JWT_SECRET`: JWT 토큰 시크릿 (랜덤 문자열)
- `POSTGRES_PASSWORD`: PostgreSQL 비밀번호

### 2. 프로덕션 환경 실행

```bash
# 전체 서비스 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 서비스 상태 확인
docker-compose ps
```

### 3. 개발 환경 실행

```bash
# 개발 환경 시작 (Hot Reload 지원)
docker-compose -f docker-compose.dev.yml up -d

# 개발 서버 로그 확인
docker-compose -f docker-compose.dev.yml logs -f frontend-dev backend-dev
```

## 📦 서비스 구성

### 프로덕션 환경 (docker-compose.yml)

| 서비스 | 포트 | 설명 |
|--------|------|------|
| frontend | 80 | Nginx + React 정적 파일 |
| backend | 3000 | Node.js API 서버 |
| database | 5432 | PostgreSQL + pgvector |

### 개발 환경 (docker-compose.dev.yml)

| 서비스 | 포트 | 설명 |
|--------|------|------|
| frontend-dev | 5173 | Vite HMR 개발 서버 |
| backend-dev | 3000 | tsx watch 개발 서버 |
| database | 5432 | PostgreSQL + pgvector |

## 🔧 Docker 명령어

### 기본 명령어

```bash
# 서비스 시작
docker-compose up -d

# 서비스 중지
docker-compose down

# 서비스 재시작
docker-compose restart

# 특정 서비스만 재시작
docker-compose restart backend

# 볼륨까지 삭제하며 완전 정리
docker-compose down -v
```

### 개발 명령어

```bash
# 개발 환경 시작
docker-compose -f docker-compose.dev.yml up -d

# 백엔드 컨테이너 접속
docker exec -it mcphub-backend-dev sh

# 프론트엔드 컨테이너 접속
docker exec -it mcphub-frontend-dev sh

# 데이터베이스 접속
docker exec -it mcphub-database-dev psql -U postgres -d mcphub
```

### 빌드 및 이미지 관리

```bash
# 이미지 다시 빌드
docker-compose build

# 이미지 강제 재빌드
docker-compose build --no-cache

# 사용하지 않는 이미지 정리
docker image prune

# 전체 시스템 정리
docker system prune -a
```

## 📁 볼륨 관리

### 데이터 지속성

```bash
# 데이터베이스 볼륨 백업
docker run --rm -v mcphub_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .

# 데이터베이스 볼륨 복원
docker run --rm -v mcphub_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /data
```

### 개발 시 볼륨 마운트

개발 환경에서는 소스 코드가 호스트와 컨테이너 간에 동기화됩니다:

- **Frontend**: `./frontend/src` → `/app/src`
- **Backend**: `./src` → `/app/src`
- **설정 파일**: `./mcp_settings.json` → `/app/mcp_settings.json`

## 🌐 접속 정보

### 프로덕션 환경
- **웹 대시보드**: http://localhost
- **API 서버**: http://localhost:3000
- **MCP 엔드포인트**: http://localhost:3000/mcp

### 개발 환경
- **웹 대시보드**: http://localhost:5173
- **API 서버**: http://localhost:3000
- **MCP 엔드포인트**: http://localhost:3000/mcp

## 🔍 트러블슈팅

### 일반적인 문제

#### 1. 포트 충돌
```bash
# 포트 사용 확인
lsof -i :80
lsof -i :3000
lsof -i :5432

# 포트 변경 (.env 파일 수정)
FRONTEND_PORT=8080
```

#### 2. 데이터베이스 연결 실패
```bash
# 데이터베이스 상태 확인
docker-compose logs database

# 수동 연결 테스트
docker exec -it mcphub-database psql -U postgres -d mcphub
```

#### 3. GitHub OAuth 설정 오류
```bash
# 환경변수 확인
docker-compose exec backend env | grep GITHUB

# GitHub OAuth 앱 설정 확인
# - Homepage URL: http://localhost
# - Callback URL: http://localhost/api/auth/github/callback
```

#### 4. 빌드 실패
```bash
# 캐시 삭제 후 재빌드
docker-compose build --no-cache

# Node.js 버전 확인
docker-compose exec backend node --version
```

### 로그 분석

```bash
# 전체 로그
docker-compose logs

# 특정 서비스 로그
docker-compose logs backend
docker-compose logs frontend
docker-compose logs database

# 실시간 로그 모니터링
docker-compose logs -f --tail=100
```

## 🔐 보안 설정

### 운영 환경 보안 체크리스트

- [ ] `.env` 파일을 `.gitignore`에 추가
- [ ] `JWT_SECRET`을 강력한 랜덤 문자열로 설정
- [ ] `POSTGRES_PASSWORD`를 안전한 비밀번호로 설정
- [ ] GitHub OAuth 앱의 callback URL을 정확히 설정
- [ ] 필요시 Nginx에서 SSL/TLS 설정
- [ ] 데이터베이스 외부 접근 제한 (포트 5432 제거)

### SSL/TLS 설정 (선택사항)

```nginx
# frontend/nginx.conf에 SSL 설정 추가
server {
    listen 443 ssl;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... 나머지 설정
}
```

## 📚 관련 문서

- [MCPHub 프로젝트 상태](./mcphub-project-status.md)
- [API 참조 문서](./api-reference.md)
- [데이터베이스 스키마](./database-schema.md)
- [환경변수 시스템](./mcphub-env-var-system.md)