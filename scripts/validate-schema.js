#!/usr/bin/env node

/**
 * MCPHub 데이터베이스 스키마 검증 스크립트
 * 
 * 이 스크립트는 현재 DB 스키마가 문서와 일치하는지 검증합니다.
 */

import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/mcphub';

// 예상되는 테이블 구조
const EXPECTED_TABLES = {
    users: {
        columns: [
            'id', 'githubId', 'githubUsername', 'email', 'avatarUrl', 'displayName',
            'githubProfileUrl', 'isAdmin', 'isActive', 'lastLoginAt', 'createdAt', 'updatedAt'
        ],
        primaryKey: 'id',
        uniqueConstraints: ['githubId', 'githubUsername']
    },
    mcphub_keys: {
        columns: [
            'id', 'keyValue', 'name', 'description', 'userId', 'isActive', 'expiresAt',
            'lastUsedAt', 'usageCount', 'serviceTokens', 'createdAt', 'updatedAt'
        ],
        primaryKey: 'id',
        uniqueConstraints: ['keyValue']
    },
    mcp_servers: {
        columns: [
            'id', 'name', 'displayName', 'description', 'type', 'command', 'args',
            'url', 'headers', 'enabled', 'groupName', 'sortOrder', 'isBuiltIn',
            'createdAt', 'updatedAt'
        ],
        primaryKey: 'id',
        uniqueConstraints: ['name']
    },
    mcp_server_env_vars: {
        columns: [
            'id', 'serverId', 'varName', 'displayName', 'description', 'required',
            'isSecret', 'defaultValue', 'validationRegex', 'sortOrder', 'createdAt', 'updatedAt'
        ],
        primaryKey: 'id'
    },
    user_api_keys: {
        columns: [
            'id', 'userId', 'serverId', 'varName', 'encryptedValue', 'createdAt', 'updatedAt'
        ],
        primaryKey: 'id',
        uniqueConstraints: ['userId,serverId,varName']
    },
    user_tokens: {
        columns: [
            'id', 'userId', 'tokenType', 'encryptedToken', 'tokenName', 'isActive',
            'createdAt', 'updatedAt', 'lastUsed'
        ],
        primaryKey: 'id',
        uniqueConstraints: ['userId,tokenType']
    },
    vector_embeddings: {
        columns: [
            'id', 'content_type', 'content_id', 'text_content', 'metadata',
            'dimensions', 'model', 'created_at', 'updated_at', 'embedding'
        ],
        primaryKey: 'id'
    }
};

async function validateSchema() {
    const pool = new Pool({ connectionString: DATABASE_URL });

    try {
        console.log('🔍 MCPHub 데이터베이스 스키마 검증 시작...\n');

        // 1. 테이블 존재 여부 확인
        console.log('📋 1. 테이블 존재 여부 확인');
        const tableResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

        const existingTables = tableResult.rows.map(row => row.table_name);
        console.log(`   발견된 테이블: ${existingTables.join(', ')}`);

        const expectedTableNames = Object.keys(EXPECTED_TABLES);
        const missingTables = expectedTableNames.filter(name => !existingTables.includes(name));
        const extraTables = existingTables.filter(name => !expectedTableNames.includes(name));

        if (missingTables.length > 0) {
            console.log(`   ❌ 누락된 테이블: ${missingTables.join(', ')}`);
        }

        if (extraTables.length > 0) {
            console.log(`   ⚠️  추가 테이블: ${extraTables.join(', ')}`);
        }

        if (missingTables.length === 0 && extraTables.length === 0) {
            console.log('   ✅ 모든 예상 테이블이 존재합니다.');
        }

        console.log();

        // 2. 각 테이블의 컬럼 구조 확인
        console.log('📊 2. 테이블 컬럼 구조 확인');

        for (const tableName of expectedTableNames) {
            if (!existingTables.includes(tableName)) {
                console.log(`   ⏭️  ${tableName}: 테이블이 존재하지 않음`);
                continue;
            }

            const columnResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

            const existingColumns = columnResult.rows.map(row => row.column_name);
            const expectedColumns = EXPECTED_TABLES[tableName].columns;

            const missingColumns = expectedColumns.filter(col => !existingColumns.includes(col));
            const extraColumns = existingColumns.filter(col => !expectedColumns.includes(col));

            console.log(`   📋 ${tableName}:`);
            console.log(`      컬럼 수: ${existingColumns.length} (예상: ${expectedColumns.length})`);

            if (missingColumns.length > 0) {
                console.log(`      ❌ 누락된 컬럼: ${missingColumns.join(', ')}`);
            }

            if (extraColumns.length > 0) {
                console.log(`      ⚠️  추가 컬럼: ${extraColumns.join(', ')}`);
            }

            if (missingColumns.length === 0 && extraColumns.length === 0) {
                console.log(`      ✅ 컬럼 구조가 일치합니다.`);
            }
        }

        console.log();

        // 3. 인덱스 및 제약조건 확인
        console.log('🔗 3. 인덱스 및 제약조건 확인');

        for (const tableName of expectedTableNames) {
            if (!existingTables.includes(tableName)) continue;

            const indexResult = await pool.query(`
        SELECT 
          i.relname as index_name,
          a.attname as column_name,
          ix.indisunique as is_unique,
          ix.indisprimary as is_primary
        FROM pg_class t, pg_class i, pg_index ix, pg_attribute a
        WHERE t.oid = ix.indrelid 
        AND i.oid = ix.indexrelid 
        AND a.attrelid = t.oid 
        AND a.attnum = ANY(ix.indkey)
        AND t.relkind = 'r'
        AND t.relname = $1
        ORDER BY i.relname, a.attnum
      `, [tableName]);

            const indexes = indexResult.rows;
            const primaryKeys = indexes.filter(idx => idx.is_primary).map(idx => idx.column_name);
            const uniqueIndexes = indexes.filter(idx => idx.is_unique && !idx.is_primary);

            console.log(`   📋 ${tableName}:`);
            console.log(`      Primary Key: ${primaryKeys.join(', ')}`);

            if (uniqueIndexes.length > 0) {
                console.log(`      Unique Indexes: ${uniqueIndexes.map(idx => idx.index_name).join(', ')}`);
            }

            const expectedPK = EXPECTED_TABLES[tableName].primaryKey;
            if (primaryKeys.includes(expectedPK)) {
                console.log(`      ✅ Primary Key 일치`);
            } else {
                console.log(`      ❌ Primary Key 불일치 (예상: ${expectedPK}, 실제: ${primaryKeys.join(', ')})`);
            }
        }

        console.log();

        // 4. 외래키 관계 확인
        console.log('🔗 4. 외래키 관계 확인');

        const fkResult = await pool.query(`
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `);

        const foreignKeys = fkResult.rows;

        for (const fk of foreignKeys) {
            console.log(`   🔗 ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        }

        console.log();

        // 5. 데이터 샘플 확인
        console.log('📊 5. 데이터 샘플 확인');

        for (const tableName of expectedTableNames) {
            if (!existingTables.includes(tableName)) continue;

            const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
            const count = parseInt(countResult.rows[0].count);

            console.log(`   📋 ${tableName}: ${count}개 레코드`);

            if (count > 0) {
                const sampleResult = await pool.query(`SELECT * FROM ${tableName} LIMIT 1`);
                const sample = sampleResult.rows[0];
                console.log(`      샘플 데이터: ${JSON.stringify(sample, null, 2).substring(0, 100)}...`);
            }
        }

        console.log('\n✅ 스키마 검증 완료!');

    } catch (error) {
        console.error('❌ 스키마 검증 중 오류 발생:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
    validateSchema();
}

export { validateSchema };
