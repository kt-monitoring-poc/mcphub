# MCPHub 데이터베이스 마이그레이션 가이드

## 📋 개요

MCPHub의 로컬 PostgreSQL 데이터베이스를 다른 PostgreSQL 데이터베이스(Azure Container Apps, AWS RDS, Google Cloud SQL 등)로 마이그레이션하는 방법을 설명합니다.

### ✅ 검증된 환경
- **macOS (Homebrew PostgreSQL)**: `pg_dump -h localhost -U $(whoami) -d mcphub > mcphub_backup.sql` ✅ **Azure 마이그레이션 검증 완료** (2025-08-04)
- **Linux (Docker/apt)**: `pg_dump -h localhost -U postgres -d mcphub > mcphub_backup.sql` 
- **Windows**: `pg_dump -h localhost -U postgres -d mcphub > mcphub_backup.sql`

## 🚀 마이그레이션 방법

### 1. 현재 데이터베이스 백업 생성

#### 사용자명 확인 (백업 전 필수!)

PostgreSQL 사용자명은 설치 환경에 따라 다릅니다:

```bash
# 현재 연결된 DB 사용자 확인
psql -d mcphub -c "\conninfo"

# 또는 현재 시스템 사용자명 확인 (macOS/Linux)
whoami

# PostgreSQL 사용자 목록 확인
psql -d mcphub -c "\du"
```

**환경별 기본 사용자명:**
- **Linux (apt/yum 설치)**: `postgres`
- **macOS (Homebrew)**: 현재 시스템 사용자명 (예: `jungchihoon`)
- **Docker**: `postgres` (또는 컨테이너 설정에 따라)
- **Windows**: `postgres`

#### ✅ **검증된 방법: pg_dump 전체 백업** (Azure 마이그레이션 검증 완료)

```bash
# 전체 데이터베이스 백업 (스키마 + 데이터)
# 주의: 사용자명은 환경에 따라 다를 수 있습니다
# - Linux/Docker: postgres
# - macOS (Homebrew): 현재 시스템 사용자명 (예: jungchihoon)
pg_dump -h localhost -U postgres -d mcphub > mcphub_backup.sql
# macOS에서 오류 발생시:
# pg_dump -h localhost -U $(whoami) -d mcphub > mcphub_backup.sql

# ✅ 이 방법이 Azure PostgreSQL 마이그레이션에서 검증되었습니다 (2025-08-04)
```



#### 백업 성공 확인

```bash
# 백업 파일 크기 확인 (0보다 커야 함)
ls -la mcphub_backup.sql

# 백업 파일 내용 미리보기
head -20 mcphub_backup.sql
```

### 2. 대상 데이터베이스 준비

#### PostgreSQL 확장 설치 확인

새 데이터베이스에 필요한 확장들이 설치되어 있는지 확인:

##### 🧠 pgvector 확장 설치 (중요!)

MCPHub의 **Smart Routing** 기능을 위해 pgvector 확장이 필수입니다:

**Ubuntu/Debian:**
```bash
# PostgreSQL 16용 pgvector 설치
sudo apt update
sudo apt install postgresql-16-pgvector

# PostgreSQL 서비스 재시작
sudo systemctl restart postgresql
```

**CentOS/RHEL:**
```bash
# EPEL 리포지토리 활성화
sudo dnf install epel-release

# pgvector 설치
sudo dnf install pgvector_16

# PostgreSQL 서비스 재시작
sudo systemctl restart postgresql-16
```

**macOS (Homebrew):**
```bash
brew install pgvector
```

**소스 컴파일 (모든 플랫폼):**
```bash
# pgvector 소스 다운로드 및 컴파일
git clone --branch v0.8.0 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

# PostgreSQL 서비스 재시작
sudo systemctl restart postgresql
```

##### 확장 활성화 및 검증

```sql
-- uuid-ossp 확장 (UUID 생성용)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pgvector 확장 (벡터 검색용)
CREATE EXTENSION IF NOT EXISTS vector;

-- 확장 설치 확인
\dx

-- pgvector 버전 확인
SELECT extversion FROM pg_extension WHERE extname = 'vector';

-- 벡터 테이블 생성 테스트
CREATE TABLE test_vector (id SERIAL, embedding vector(1536));
DROP TABLE test_vector;
```

#### 클라우드별 pgvector 설정

##### Azure PostgreSQL Flexible Server

```bash
# Azure CLI로 PostgreSQL 확장 설치
az postgres flexible-server parameter set \
  --resource-group <resource-group> \
  --server-name <server-name> \
  --name shared_preload_libraries \
  --value "vector"

# 서버 재시작 (확장 적용)
az postgres flexible-server restart \
  --resource-group <resource-group> \
  --name <server-name>

# 확장 활성화 (psql에서 실행)
psql -h <server-name>.postgres.database.azure.com -U <username> -d postgres -c "
CREATE EXTENSION IF NOT EXISTS vector;
SELECT extversion FROM pg_extension WHERE extname = 'vector';
"
```

##### AWS RDS for PostgreSQL

```bash
# RDS 파라미터 그룹에서 shared_preload_libraries에 'vector' 추가
aws rds modify-db-parameter-group \
  --db-parameter-group-name <parameter-group-name> \
  --parameters ParameterName=shared_preload_libraries,ParameterValue=vector,ApplyMethod=pending-reboot

# RDS 인스턴스 재시작
aws rds reboot-db-instance \
  --db-instance-identifier <db-instance-identifier>

# 확장 활성화 (psql에서 실행)
psql -h <rds-endpoint> -U <username> -d postgres -c "
CREATE EXTENSION IF NOT EXISTS vector;
SELECT extversion FROM pg_extension WHERE extname = 'vector';
"
```

##### Google Cloud SQL for PostgreSQL

```bash
# Cloud SQL에서 pgvector 확장 활성화
gcloud sql instances patch <instance-name> \
  --database-flags shared_preload_libraries=vector

# 인스턴스 재시작
gcloud sql instances restart <instance-name>

# 확장 활성화 (psql에서 실행)
psql -h <cloud-sql-ip> -U <username> -d postgres -c "
CREATE EXTENSION IF NOT EXISTS vector;
SELECT extversion FROM pg_extension WHERE extname = 'vector';
"
```

### 3. 데이터베이스 복원

#### 방법 1: psql 사용

```bash
# 새 PostgreSQL 서버에 복원
psql -h <new-host> -U <username> -d <database> < mcphub_backup.sql

# 예: Azure Container Apps
psql -h mcphub-postgres.postgres.database.azure.com -U mcphub -d mcphub < mcphub_backup.sql

# 예: AWS RDS
psql -h mcphub.cluster-xyz.us-east-1.rds.amazonaws.com -U mcphub -d mcphub < mcphub_backup.sql

# 예: 로컬에서 로컬로 (테스트용)
# Linux/Docker: psql -h localhost -U postgres -d mcphub_new < mcphub_backup.sql
# macOS: psql -h localhost -U $(whoami) -d mcphub_new < mcphub_backup.sql
```



### 4. 스키마 마이그레이션 적용

현재 버전(v3.0.0)의 스키마가 적용되어 있지 않다면:

```bash
# 마이그레이션 스크립트 실행
psql -h <new-host> -U <username> -d <database> < migrations/v3.0.0-schema-migration.sql
```

### 5. 데이터 검증

복원이 완료된 후 데이터 무결성 확인:

```sql
-- 테이블 개수 확인
SELECT 
  schemaname,
  tablename,
  n_tup_ins as "Rows"
FROM pg_stat_user_tables 
ORDER BY schemaname, tablename;

-- 주요 테이블 데이터 확인
SELECT 'users' as table_name, count(*) as count FROM users
UNION ALL
SELECT 'mcphub_keys' as table_name, count(*) as count FROM mcphub_keys
UNION ALL
SELECT 'user_groups' as table_name, count(*) as count FROM user_groups
UNION ALL
SELECT 'mcp_servers' as table_name, count(*) as count FROM mcp_servers
UNION ALL
SELECT 'vector_embeddings' as table_name, count(*) as count FROM vector_embeddings;

-- 스키마 버전 확인
SELECT * FROM schema_migrations ORDER BY applied_at DESC;

-- pgvector 설치 및 벡터 인덱스 확인
\dx
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'vector_embeddings';

-- Smart Routing 기능 테스트
SELECT 
  id, 
  content_type, 
  embedding <-> '[1,0,0]'::vector as distance 
FROM vector_embeddings 
ORDER BY distance 
LIMIT 5;

-- user_groups 테이블의 servers 컬럼 타입 확인
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_groups' AND column_name = 'servers';
```

## ✅ 간단하고 검증된 마이그레이션 완료!



## 🌐 클라우드별 마이그레이션 예제

### Azure Container Apps

```bash
# 1. Azure PostgreSQL Flexible Server 생성
az postgres flexible-server create \
  --resource-group mcphub-rg \
  --name mcphub-postgres \
  --location koreacentral \
  --admin-user mcphub \
  --admin-password <password> \
  --sku-name Standard_B1ms

# 2. 확장 설치
az postgres flexible-server parameter set \
  --resource-group mcphub-rg \
  --server-name mcphub-postgres \
  --name shared_preload_libraries \
  --value "vector"

# 3. 데이터베이스 생성 및 확장 설치
psql -h mcphub-postgres.postgres.database.azure.com -U mcphub -d postgres -c "
CREATE DATABASE mcphub;
\c mcphub;
CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
CREATE EXTENSION IF NOT EXISTS vector;
"

# 4. 데이터 복원
psql -h mcphub-postgres.postgres.database.azure.com -U mcphub -d mcphub < mcphub_backup.sql
```

### AWS RDS

```bash
# RDS 인스턴스 생성 후
export RDS_ENDPOINT="mcphub.cluster-xyz.us-east-1.rds.amazonaws.com"

# 데이터베이스 및 확장 설정
psql -h $RDS_ENDPOINT -U mcphub -d postgres -c "
CREATE DATABASE mcphub;
\c mcphub;
CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
CREATE EXTENSION IF NOT EXISTS vector;
"

# 데이터 복원
psql -h $RDS_ENDPOINT -U mcphub -d mcphub < mcphub_backup.sql
```

### Google Cloud SQL

```bash
# Cloud SQL 인스턴스 생성 후
export CLOUDSQL_IP="34.xxx.xxx.xxx"

# 데이터베이스 설정
psql -h $CLOUDSQL_IP -U mcphub -d postgres -c "
CREATE DATABASE mcphub;
\c mcphub;
CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
CREATE EXTENSION IF NOT EXISTS vector;
"

# 데이터 복원
psql -h $CLOUDSQL_IP -U mcphub -d mcphub < mcphub_backup.sql
```

## 🚨 주의사항

### pgvector 특별 고려사항

1. **벡터 인덱스 성능**: 
   - IVFFlat 인덱스는 데이터가 충분할 때 효과적 (최소 1000개 벡터 권장)
   - 인덱스 재생성이 필요할 수 있음: `REINDEX INDEX idx_vector_embeddings_embedding;`

2. **벡터 차원 호환성**:
   - 현재 MCPHub는 OpenAI 임베딩 (1536 차원) 사용
   - 다른 임베딩 모델 사용 시 차원 수 확인 필요

3. **메모리 사용량**:
   - 벡터 데이터는 메모리를 많이 사용하므로 충분한 RAM 확보
   - `shared_buffers`, `work_mem` 설정 최적화 권장

```sql
-- 벡터 인덱스 성능 최적화 설정 예시
SET work_mem = '256MB';
SET shared_buffers = '256MB';
SET maintenance_work_mem = '1GB';
```

### 보안 고려사항

1. **연결 보안**: SSL/TLS 연결 사용
```bash
# SSL 연결 강제
psql "host=<host> user=<user> dbname=<db> sslmode=require" < backup.sql
```

2. **방화벽 설정**: 마이그레이션 중에만 임시로 IP 허용

3. **자격증명 보호**: 환경변수나 비밀 관리 서비스 사용

### 성능 최적화

```bash
# 빠른 복원을 위한 설정
psql -h <host> -U <user> -d <db> -c "
SET maintenance_work_mem = '1GB';
SET checkpoint_completion_target = 0.9;
SET wal_buffers = '16MB';
"
```

### 롤백 계획

```bash
# 새 데이터베이스 백업 (롤백용)
pg_dump -h <new-host> -U <username> -d <database> > rollback_backup.sql

# 롤백이 필요한 경우
dropdb -h <new-host> -U <username> <database>
createdb -h <new-host> -U <username> <database>
psql -h <new-host> -U <username> -d <database> < rollback_backup.sql
```

## 📋 마이그레이션 체크리스트

### ✅ 검증 완료 (2025-08-04)

**로컬 → Azure PostgreSQL Flexible Server 마이그레이션 성공!**

### 마이그레이션 전
- [x] 현재 데이터베이스 백업 생성 ✅
- [x] 새 데이터베이스 서버 설정 완료 ✅
- [x] 필요한 확장(uuid-ossp, vector) 설치 확인 ✅
- [x] 네트워크 연결 및 방화벽 설정 확인 ✅
- [x] MCPHub 서비스 중단 ✅

### 마이그레이션 중
- [x] 스키마 복원 완료 ✅
- [x] 데이터 복원 완료 ✅
- [x] 마이그레이션 스크립트 실행 ✅
- [x] 인덱스 재생성 (IVFFlat 벡터 인덱스) ✅

### 마이그레이션 후
- [x] 데이터 무결성 검증 ✅
- [ ] 애플리케이션 연결 문자열 업데이트
- [ ] MCPHub 서비스 재시작
- [ ] 기능 테스트 수행
- [x] 이전 데이터베이스 백업 보관 ✅

## 🎯 마이그레이션 성공 결과 (2025-08-04)

### 📊 복원된 데이터
```
users: 4개 사용자 계정
mcphub_keys: 3개 API 키  
vector_embeddings: 161개 벡터 임베딩 (스마트 라우팅용)
user_groups: 0개 (신규 사용자 그룹 기능)
```

### 🔧 설치된 확장
- **uuid-ossp**: v1.1 (UUID 생성)
- **pgvector**: v0.8.0 (벡터 검색 및 스마트 라우팅)

### ✅ 검증된 기능
- [x] 벡터 거리 계산 (코사인 유사도)
- [x] IVFFlat 인덱스 정상 작동
- [x] 스마트 라우팅 시스템 준비 완료
- [x] 사용자 인증 시스템 데이터 완전 보존

## 🔗 관련 문서

- [데이터베이스 스키마](./database-schema.md)
- [환경변수 설정](./mcphub-env-var-system.md)
- [Docker 설정](./docker-setup.md)
- [v3.0.0 릴리즈 노트](./release-notes/v3.0.1-frontend-backend-separation-2025-08-03.md)

---

> **💡 팁**: 프로덕션 환경 마이그레이션 전에는 반드시 테스트 환경에서 먼저 수행하여 문제점을 미리 파악하시기 바랍니다.