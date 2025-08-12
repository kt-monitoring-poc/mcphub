-- MCPHub v3.0.0 스키마 마이그레이션
-- 2025-08-01
-- 기존 데이터 보존하면서 새로운 스키마 구조로 업데이트

BEGIN;

-- 1. 현재 user_groups 테이블의 데이터 백업
CREATE TABLE user_groups_backup AS SELECT * FROM user_groups;

-- 2. user_groups 테이블 구조 업데이트
-- servers 컬럼을 TEXT에서 TEXT[]로 변경
ALTER TABLE user_groups 
  ALTER COLUMN servers TYPE TEXT[] 
  USING string_to_array(servers, ',');

-- name 컬럼을 NOT NULL로 변경 (기존에 nullable이었던 경우)
UPDATE user_groups SET name = 'Default Group ' || id::text WHERE name IS NULL;
ALTER TABLE user_groups ALTER COLUMN name SET NOT NULL;

-- name 컬럼 길이를 100자로 변경 (기존 255자에서)
ALTER TABLE user_groups ALTER COLUMN name TYPE VARCHAR(100);

-- 3. 필요한 인덱스 추가
CREATE INDEX IF NOT EXISTS IDX_user_groups_user_active ON user_groups("userId", "isActive");

-- 6. 마이그레이션 기록
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(20) NOT NULL,
  description TEXT,
  applied_at TIMESTAMP NOT NULL DEFAULT now()
);

INSERT INTO schema_migrations (version, description) 
VALUES ('3.0.0', 'User groups schema migration: servers TEXT -> TEXT[], name column constraints updated');

-- 4. 검증 쿼리 (실행 후 확인용)
-- SELECT 'Migration completed. Verification:';
-- SELECT 'user_groups count:', count(*) FROM user_groups;
-- SELECT 'users count:', count(*) FROM users;
-- SELECT 'mcphub_keys count:', count(*) FROM mcphub_keys;

COMMIT;

-- 백업 테이블 정리 (성공 확인 후 실행)
-- DROP TABLE IF EXISTS user_groups_backup;