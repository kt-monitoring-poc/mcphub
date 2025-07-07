/**
 * 벡터 검색 서비스
 * 
 * OpenAI 임베딩 API를 사용하여 MCP 도구들의 벡터 임베딩을 생성하고,
 * 의미론적 유사성 검색을 제공하는 서비스입니다.
 * PostgreSQL의 pgvector 확장을 사용하여 벡터 데이터를 저장하고 검색합니다.
 * 
 * 주요 기능:
 * - OpenAI 임베딩 API를 통한 텍스트 벡터화
 * - 폴백 임베딩 생성 (API 사용 불가 시)
 * - 도구 정보의 벡터 임베딩 저장
 * - 의미론적 유사성 기반 도구 검색
 * - 벡터 차원 호환성 관리
 * - 서버별 도구 임베딩 동기화
 */

import { getRepositoryFactory } from '../db/index.js';
import { VectorEmbeddingRepository } from '../db/repositories/index.js';
import { ToolInfo } from '../types/index.js';
import { getAppDataSource, initializeDatabase } from '../db/connection.js';
import { getSmartRoutingConfig } from '../utils/smartRouting.js';
import OpenAI from 'openai';

/**
 * 스마트 라우팅 설정에서 OpenAI 구성 조회
 * 
 * @returns {object} OpenAI API 키, 베이스 URL, 임베딩 모델 설정
 */
const getOpenAIConfig = () => {
  const smartRoutingConfig = getSmartRoutingConfig();
  return {
    apiKey: smartRoutingConfig.openaiApiKey,
    baseURL: smartRoutingConfig.openaiApiBaseUrl,
    embeddingModel: smartRoutingConfig.openaiApiEmbeddingModel,
  };
};

/**
 * 임베딩 모델별 벡터 차원 상수
 */
const EMBEDDING_DIMENSIONS = 1536; // OpenAI의 text-embedding-3-small 출력 차원
const BGE_DIMENSIONS = 1024; // BAAI/bge-m3 출력 차원
const FALLBACK_DIMENSIONS = 100; // 폴백 구현 차원

/**
 * 모델에 따른 벡터 차원 수 조회
 * 
 * @param {string} model - 임베딩 모델 이름
 * @returns {number} 해당 모델의 벡터 차원 수
 */
const getDimensionsForModel = (model: string): number => {
  if (model.includes('bge-m3')) {
    return BGE_DIMENSIONS;
  } else if (model.includes('text-embedding-3')) {
    return EMBEDDING_DIMENSIONS;
  } else if (model === 'fallback' || model === 'simple-hash') {
    return FALLBACK_DIMENSIONS;
  }
  // 기본값으로 OpenAI 차원 사용
  return EMBEDDING_DIMENSIONS;
};

/**
 * 스마트 라우팅 설정으로 OpenAI 클라이언트 초기화
 * 
 * @returns {OpenAI} 설정된 OpenAI 클라이언트 인스턴스
 */
const getOpenAIClient = () => {
  const config = getOpenAIConfig();
  return new OpenAI({
    apiKey: config.apiKey, // 스마트 라우팅 설정 또는 환경변수에서 API 키 조회
    baseURL: config.baseURL, // 스마트 라우팅 설정 또는 기본 URL 사용
  });
};

/**
 * OpenAI 임베딩 모델을 사용한 텍스트 임베딩 생성
 *
 * 주의: 임베딩은 기본적으로 1536차원입니다.
 * 이전에 폴백 구현(100차원)을 사용했다면,
 * 전환 후 벡터 데이터베이스 인덱스를 재구축해야 할 수 있습니다.
 *
 * @param {string} text - 임베딩을 생성할 텍스트
 * @returns {Promise<number[]>} 벡터 임베딩 배열
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const config = getOpenAIConfig();
    const openai = getOpenAIClient();

    // API 키 설정 확인
    if (!openai.apiKey) {
      console.warn('OpenAI API key is not configured. Using fallback embedding method.');
      return generateFallbackEmbedding(text);
    }

    // 텍스트가 너무 긴 경우 자르기 (OpenAI 토큰 제한)
    const truncatedText = text.length > 8000 ? text.substring(0, 8000) : text;

    // OpenAI 임베딩 API 호출
    const response = await openai.embeddings.create({
      model: config.embeddingModel, // 더 나은 성능의 최신 모델
      input: truncatedText,
    });

    // 임베딩 반환
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    console.warn('Falling back to simple embedding method');
    return generateFallbackEmbedding(text);
  }
}

/**
 * OpenAI API를 사용할 수 없을 때의 폴백 임베딩 함수
 * 
 * 간단한 어휘 기반 접근법을 사용하여 임베딩을 생성합니다.
 * 
 * @param {string} text - 임베딩을 생성할 텍스트
 * @returns {number[]} 벡터 임베딩 배열
 */
function generateFallbackEmbedding(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/);
  
  // 사전 정의된 어휘 목록
  const vocabulary = [
    'search', 'find', 'get', 'fetch', 'retrieve', 'query',
    'map', 'location', 'weather', 'file', 'directory',
    'email', 'message', 'send', 'create', 'update', 'delete',
    'browser', 'web', 'page', 'click', 'navigate', 'screenshot', 'automation',
    'database', 'table', 'record', 'insert', 'select', 'schema', 'data',
    'image', 'photo', 'video', 'media', 'upload', 'download', 'convert',
    'text', 'document', 'pdf', 'excel', 'word', 'format', 'parse',
    'api', 'rest', 'http', 'request', 'response', 'json', 'xml',
    'time', 'date', 'calendar', 'schedule', 'reminder', 'clock',
    'math', 'calculate', 'number', 'sum', 'average', 'statistics',
    'user', 'account', 'login', 'auth', 'permission', 'role',
  ];

  // 폴백 차원으로 벡터 생성
  const vector = new Array(FALLBACK_DIMENSIONS).fill(0);

  words.forEach((word) => {
    const index = vocabulary.indexOf(word);
    if (index >= 0 && index < vector.length) {
      vector[index] += 1;
    }
    // 단어 해시를 기반으로 무작위성 추가
    const hash = word.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    vector[hash % vector.length] += 0.1;
  });

  // 벡터 정규화
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    return vector.map((val) => val / magnitude);
  }

  return vector;
}

/**
 * 도구 정보를 벡터 임베딩으로 저장
 * 
 * 각 도구의 이름, 설명, 입력 스키마를 결합하여 검색 가능한 텍스트를 생성하고,
 * 이를 벡터 임베딩으로 변환하여 데이터베이스에 저장합니다.
 * 
 * @param {string} serverName - 서버 이름
 * @param {ToolInfo[]} tools - 저장할 도구 배열
 * @returns {Promise<void>}
 */
export const saveToolsAsVectorEmbeddings = async (
  serverName: string,
  tools: ToolInfo[],
): Promise<void> => {
  try {
    if (tools.length === 0) {
      console.warn(`No tools to save for server: ${serverName}`);
      return;
    }

    const smartRoutingConfig = getSmartRoutingConfig();
    if (!smartRoutingConfig.enabled) {
      return;
    }

    const config = getOpenAIConfig();
    const vectorRepository = getRepositoryFactory(
      'vectorEmbeddings',
    )() as VectorEmbeddingRepository;

    for (const tool of tools) {
      // 도구 정보에서 검색 가능한 텍스트 생성
      const searchableText = [
        tool.name,
        tool.description,
        // 입력 스키마 속성이 있는 경우 포함
        ...(tool.inputSchema && typeof tool.inputSchema === 'object'
          ? Object.keys(tool.inputSchema).filter((key) => key !== 'type' && key !== 'properties')
          : []),
        // 스키마 속성 이름이 있는 경우 포함
        ...(tool.inputSchema &&
        tool.inputSchema.properties &&
        typeof tool.inputSchema.properties === 'object'
          ? Object.keys(tool.inputSchema.properties)
          : []),
      ]
        .filter(Boolean)
        .join(' ');

      try {
        // 임베딩 생성
        const embedding = await generateEmbedding(searchableText);

        // 저장 전 데이터베이스 호환성 확인
        await checkDatabaseVectorDimensions(embedding.length);

        // 임베딩 저장
        await vectorRepository.saveEmbedding(
          'tool',
          `${serverName}:${tool.name}`,
          searchableText,
          embedding,
          {
            serverName,
            toolName: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          },
          config.embeddingModel, // 이 임베딩에 사용된 모델 저장
        );
      } catch (toolError) {
        console.error(`Error processing tool ${tool.name} for server ${serverName}:`, toolError);
        // 전체 배치를 실패시키지 않고 다음 도구로 계속
      }
    }

    console.log(`Saved ${tools.length} tool embeddings for server: ${serverName}`);
  } catch (error) {
    console.error(`Error saving tool embeddings for server ${serverName}:`, error);
  }
};

/**
 * 벡터 유사성을 사용한 도구 검색
 * 
 * 검색 쿼리를 벡터로 변환하고 저장된 도구 임베딩과의 유사성을 계산하여
 * 가장 관련성 높은 도구들을 반환합니다.
 * 
 * @param {string} query - 검색 쿼리 텍스트
 * @param {number} [limit=10] - 반환할 최대 결과 수
 * @param {number} [threshold=0.7] - 유사성 임계값 (0-1)
 * @param {string[]} [serverNames] - 필터링할 서버 이름 배열 (선택사항)
 * @returns {Promise<Array>} 검색 결과 배열 (서버명, 도구명, 설명, 유사성 점수 포함)
 */
export const searchToolsByVector = async (
  query: string,
  limit: number = 10,
  threshold: number = 0.7,
  serverNames?: string[],
): Promise<
  Array<{
    serverName: string;
    toolName: string;
    description: string;
    inputSchema: any;
    similarity: number;
    searchableText: string;
  }>
> => {
  try {
    const vectorRepository = getRepositoryFactory(
      'vectorEmbeddings',
    )() as VectorEmbeddingRepository;

    // 벡터 유사성을 사용한 텍스트 검색
    const results = await vectorRepository.searchByText(
      query,
      generateEmbedding,
      limit,
      threshold,
      ['tool'],
    );

    // 서버 이름으로 필터링 (제공된 경우)
    let filteredResults = results;
    if (serverNames && serverNames.length > 0) {
      filteredResults = results.filter((result) => {
        if (typeof result.embedding.metadata === 'string') {
          try {
            const parsedMetadata = JSON.parse(result.embedding.metadata);
            return serverNames.includes(parsedMetadata.serverName);
          } catch (error) {
            return false;
          }
        }
        return false;
      });
    }

    // 결과를 더 유용한 형태로 변환
    return filteredResults.map((result) => {
      // 문자열로 저장된 메타데이터를 파싱해야 하는지 확인
      if (result.embedding?.metadata && typeof result.embedding.metadata === 'string') {
        try {
          // 메타데이터 문자열을 JSON으로 파싱
          const parsedMetadata = JSON.parse(result.embedding.metadata);

          if (parsedMetadata.serverName && parsedMetadata.toolName) {
            // 제대로 구조화된 메타데이터가 있는 경우
            return {
              serverName: parsedMetadata.serverName,
              toolName: parsedMetadata.toolName,
              description: parsedMetadata.description || '',
              inputSchema: parsedMetadata.inputSchema || {},
              similarity: result.similarity,
              searchableText: result.embedding.text_content,
            };
          }
        } catch (error) {
          console.error('Error parsing metadata string:', error);
          // 아래 추출 로직으로 진행
        }
      }

      // 메타데이터를 사용할 수 없거나 파싱에 실패한 경우 text_content에서 도구 정보 추출
      const textContent = result.embedding?.text_content || '';

      // toolName 추출 (text_content의 첫 번째 단어)
      const toolNameMatch = textContent.match(/^(\S+)/);
      const toolName = toolNameMatch ? toolNameMatch[1] : '';

      // toolName이 "serverName_toolPart" 패턴을 따르는 경우 serverName 추출
      const serverNameMatch = toolName.match(/^([^_]+)_/);
      const serverName = serverNameMatch ? serverNameMatch[1] : 'unknown';

      // 설명 추출 (첫 번째 단어 이후의 모든 내용)
      const description = textContent.replace(/^\S+\s*/, '').trim();

      return {
        serverName,
        toolName,
        description,
        inputSchema: {},
        similarity: result.similarity,
        searchableText: textContent,
      };
    });
  } catch (error) {
    console.error('Error searching tools by vector:', error);
    return [];
  }
};

/**
 * 벡터 데이터베이스의 모든 도구 조회
 * 
 * 저장된 모든 도구 임베딩을 조회하여 반환합니다.
 * 선택적으로 서버 이름으로 필터링할 수 있습니다.
 * 
 * @param {string[]} [serverNames] - 필터링할 서버 이름 배열 (선택사항)
 * @returns {Promise<Array>} 모든 벡터화된 도구 목록
 */
export const getAllVectorizedTools = async (
  serverNames?: string[],
): Promise<
  Array<{
    serverName: string;
    toolName: string;
    description: string;
    inputSchema: any;
  }>
> => {
  try {
    const config = getOpenAIConfig();
    const vectorRepository = getRepositoryFactory(
      'vectorEmbeddings',
    )() as VectorEmbeddingRepository;

    // 데이터베이스가 사용하는 차원 결정 시도
    let dimensionsToUse = getDimensionsForModel(config.embeddingModel); // 선택된 모델을 기반으로 한 기본값

    try {
      const result = await getAppDataSource().query(`
        SELECT atttypmod as dimensions
        FROM pg_attribute 
        WHERE attrelid = 'vector_embeddings'::regclass 
        AND attname = 'embedding'
      `);

      if (result && result.length > 0 && result[0].dimensions) {
        const rawValue = result[0].dimensions;

        if (rawValue === -1) {
          // 타입 수정자가 지정되지 않음
          dimensionsToUse = getDimensionsForModel(config.embeddingModel);
        } else {
          // 이 버전의 pgvector에서는 atttypmod가 차원 값을 직접 저장
          dimensionsToUse = rawValue;
        }
      }
    } catch (error: any) {
      console.warn('Could not determine vector dimensions from database:', error?.message);
    }

    // 모든 도구 임베딩 조회
    const results = await vectorRepository.searchSimilar(
      new Array(dimensionsToUse).fill(0), // 데이터베이스 차원과 일치하는 영벡터
      1000, // 큰 제한값
      -1, // 임계값 없음 (모든 것 조회)
      ['tool'],
    );

    // 서버 이름으로 필터링 (제공된 경우)
    let filteredResults = results;
    if (serverNames && serverNames.length > 0) {
      filteredResults = results.filter((result) => {
        if (typeof result.embedding.metadata === 'string') {
          try {
            const parsedMetadata = JSON.parse(result.embedding.metadata);
            return serverNames.includes(parsedMetadata.serverName);
          } catch (error) {
            return false;
          }
        }
        return false;
      });
    }

    // 결과 변환
    return filteredResults.map((result) => {
      if (typeof result.embedding.metadata === 'string') {
        try {
          const parsedMetadata = JSON.parse(result.embedding.metadata);
          return {
            serverName: parsedMetadata.serverName,
            toolName: parsedMetadata.toolName,
            description: parsedMetadata.description,
            inputSchema: parsedMetadata.inputSchema,
          };
        } catch (error) {
          console.error('Error parsing metadata string:', error);
          return {
            serverName: 'unknown',
            toolName: 'unknown',
            description: '',
            inputSchema: {},
          };
        }
      }
      return {
        serverName: 'unknown',
        toolName: 'unknown',
        description: '',
        inputSchema: {},
      };
    });
  } catch (error) {
    console.error('Error getting all vectorized tools:', error);
    return [];
  }
};

/**
 * 서버의 도구 임베딩 제거
 * 
 * 지정된 서버의 모든 도구 임베딩을 데이터베이스에서 제거합니다.
 * 
 * @param {string} serverName - 서버 이름
 * @returns {Promise<void>}
 */
export const removeServerToolEmbeddings = async (serverName: string): Promise<void> => {
  try {
    const _vectorRepository = getRepositoryFactory(
      'vectorEmbeddings',
    )() as VectorEmbeddingRepository;

    // 참고: VectorEmbeddingRepository에 delete 메소드를 추가해야 합니다
    // 현재는 이 기능이 구현되어야 함을 로그로 남깁니다
    console.log(`TODO: Remove tool embeddings for server: ${serverName}`);
  } catch (error) {
    console.error(`Error removing tool embeddings for server ${serverName}:`, error);
  }
};

/**
 * 스마트 라우팅이 처음 활성화될 때 모든 서버 도구 임베딩 동기화
 * 
 * 현재 연결된 모든 서버를 스캔하고 해당 도구들을 벡터 임베딩으로 저장합니다.
 * 
 * @returns {Promise<void>}
 */
export const syncAllServerToolsEmbeddings = async (): Promise<void> => {
  try {
    console.log('Starting synchronization of all server tools embeddings...');

    // 모든 서버 정보를 가져오기 위해 getServersInfo 가져오기
    const { getServersInfo } = await import('./mcpService.js');

    const servers = getServersInfo();
    let totalToolsSynced = 0;
    let serversSynced = 0;

    for (const server of servers) {
      if (server.status === 'connected' && server.tools && server.tools.length > 0) {
        try {
          console.log(`Syncing tools for server: ${server.name} (${server.tools.length} tools)`);
          await saveToolsAsVectorEmbeddings(server.name, server.tools);
          totalToolsSynced += server.tools.length;
          serversSynced++;
        } catch (error) {
          console.error(`Failed to sync tools for server ${server.name}:`, error);
        }
      } else if (server.status === 'connected' && (!server.tools || server.tools.length === 0)) {
        console.log(`Server ${server.name} is connected but has no tools to sync`);
      } else {
        console.log(`Skipping server ${server.name} (status: ${server.status})`);
      }
    }

    console.log(
      `Smart routing tools sync completed: synced ${totalToolsSynced} tools from ${serversSynced} servers`,
    );
  } catch (error) {
    console.error('Error during smart routing tools synchronization:', error);
    throw error;
  }
};

/**
 * Check database vector dimensions and ensure compatibility
 * @param dimensionsNeeded The number of dimensions required
 * @returns Promise that resolves when check is complete
 */
async function checkDatabaseVectorDimensions(dimensionsNeeded: number): Promise<void> {
  try {
    // First check if database is initialized
    if (!getAppDataSource().isInitialized) {
      console.info('Database not initialized, initializing...');
      await initializeDatabase();
    }

    // Check current vector dimension in the database
    // First try to get vector type info directly
    let vectorTypeInfo;
    try {
      vectorTypeInfo = await getAppDataSource().query(`
        SELECT 
          atttypmod,
          format_type(atttypid, atttypmod) as formatted_type
        FROM pg_attribute 
        WHERE attrelid = 'vector_embeddings'::regclass 
        AND attname = 'embedding'
      `);
    } catch (error) {
      console.warn('Could not get vector type info, falling back to atttypmod query');
    }

    // Fallback to original query
    const result = await getAppDataSource().query(`
      SELECT atttypmod as dimensions
      FROM pg_attribute 
      WHERE attrelid = 'vector_embeddings'::regclass 
      AND attname = 'embedding'
    `);

    let currentDimensions = 0;

    // Parse dimensions from result
    if (result && result.length > 0 && result[0].dimensions) {
      if (vectorTypeInfo && vectorTypeInfo.length > 0) {
        // Try to extract dimensions from formatted type like "vector(1024)"
        const match = vectorTypeInfo[0].formatted_type?.match(/vector\((\d+)\)/);
        if (match) {
          currentDimensions = parseInt(match[1]);
        }
      }

      // If we couldn't extract from formatted type, use the atttypmod value directly
      if (currentDimensions === 0) {
        const rawValue = result[0].dimensions;

        if (rawValue === -1) {
          // No type modifier specified
          currentDimensions = 0;
        } else {
          // For this version of pgvector, atttypmod stores the dimension value directly
          currentDimensions = rawValue;
        }
      }
    }

    // Also check the dimensions stored in actual records for validation
    try {
      const recordCheck = await getAppDataSource().query(`
        SELECT dimensions, model, COUNT(*) as count
        FROM vector_embeddings 
        GROUP BY dimensions, model
        ORDER BY count DESC
        LIMIT 5
      `);

      if (recordCheck && recordCheck.length > 0) {
        // If we couldn't determine dimensions from schema, use the most common dimension from records
        if (currentDimensions === 0 && recordCheck[0].dimensions) {
          currentDimensions = recordCheck[0].dimensions;
        }
      }
    } catch (error) {
      console.warn('Could not check dimensions from actual records:', error);
    }

    // If no dimensions are set or they don't match what we need, handle the mismatch
    if (currentDimensions === 0 || currentDimensions !== dimensionsNeeded) {
      console.log(
        `Vector dimensions mismatch: database=${currentDimensions}, needed=${dimensionsNeeded}`,
      );

      if (currentDimensions === 0) {
        console.log('Setting up vector dimensions for the first time...');
      } else {
        console.log('Dimension mismatch detected. Clearing existing incompatible vector data...');

        // Clear all existing vector embeddings with mismatched dimensions
        await clearMismatchedVectorData(dimensionsNeeded);
      }

      // Drop any existing indices first
      await getAppDataSource().query(`DROP INDEX IF EXISTS idx_vector_embeddings_embedding;`);

      // Alter the column type with the new dimensions
      await getAppDataSource().query(`
        ALTER TABLE vector_embeddings 
        ALTER COLUMN embedding TYPE vector(${dimensionsNeeded});
      `);

      // Create a new index with better error handling
      try {
        await getAppDataSource().query(`
          CREATE INDEX idx_vector_embeddings_embedding 
          ON vector_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
        `);
      } catch (indexError: any) {
        // If the index already exists (code 42P07) or there's a duplicate key constraint (code 23505),
        // it's not a critical error as the index is already there
        if (indexError.code === '42P07' || indexError.code === '23505') {
          console.log('Index already exists, continuing...');
        } else {
          console.warn('Warning: Failed to create index, but continuing:', indexError.message);
        }
      }

      console.log(`Successfully configured vector dimensions to ${dimensionsNeeded}`);
    }
  } catch (error: any) {
    console.error('Error checking/updating vector dimensions:', error);
    throw new Error(`Vector dimension check failed: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Clear vector embeddings with mismatched dimensions
 * @param expectedDimensions The expected dimensions
 * @returns Promise that resolves when cleanup is complete
 */
async function clearMismatchedVectorData(expectedDimensions: number): Promise<void> {
  try {
    console.log(
      `Clearing vector embeddings with dimensions different from ${expectedDimensions}...`,
    );

    // Delete all embeddings that don't match the expected dimensions
    await getAppDataSource().query(
      `
      DELETE FROM vector_embeddings 
      WHERE dimensions != $1
    `,
      [expectedDimensions],
    );

    console.log('Successfully cleared mismatched vector embeddings');
  } catch (error: any) {
    console.error('Error clearing mismatched vector data:', error);
    throw error;
  }
}
