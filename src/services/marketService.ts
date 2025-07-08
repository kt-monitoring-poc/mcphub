/**
 * 마켓플레이스 서비스
 * 
 * MCP 서버 마켓플레이스의 데이터 관리와 검색 기능을 제공합니다.
 * servers.json 파일에서 마켓 서버 정보를 로드하고 다양한 필터링 및 검색 기능을 제공합니다.
 * 
 * 주요 기능:
 * - 마켓 서버 데이터 로드 및 정렬
 * - 서버 검색 및 필터링
 * - 카테고리 및 태그 관리
 * - 공식 서버 우선 정렬
 */

import fs from 'fs';
import { MarketServer } from '../types/index.js';
import { getConfigFilePath } from '../utils/path.js';

/**
 * servers.json 파일 경로 조회
 * 
 * 마켓 서버 데이터가 저장된 servers.json 파일의 전체 경로를 반환합니다.
 * 
 * @returns {string} servers.json 파일의 절대 경로
 */
export const getServersJsonPath = (): string => {
  return getConfigFilePath('servers.json', 'Servers');
};

/**
 * 모든 마켓 서버 로드
 * 
 * servers.json 파일에서 모든 마켓 서버 정보를 로드합니다.
 * 공식 서버를 우선으로 정렬하여 반환합니다.
 * 
 * @returns {Record<string, MarketServer>} 서버 이름을 키로 하는 마켓 서버 객체
 */
export const getMarketServers = (): Record<string, MarketServer> => {
  try {
    const serversJsonPath = getServersJsonPath();
    const data = fs.readFileSync(serversJsonPath, 'utf8');
    const serversObj = JSON.parse(data) as Record<string, MarketServer>;

    // 공식 서버를 우선으로 정렬
    const sortedEntries = Object.entries(serversObj).sort(([, serverA], [, serverB]) => {
      if (serverA.is_official && !serverB.is_official) return -1;
      if (!serverA.is_official && serverB.is_official) return 1;
      return 0;
    });

    return Object.fromEntries(sortedEntries);
  } catch (error) {
    console.error('Failed to load servers from servers.json:', error);
    return {};
  }
};

/**
 * 특정 마켓 서버 조회
 * 
 * 서버 이름으로 특정 마켓 서버의 정보를 조회합니다.
 * 
 * @param {string} name - 조회할 서버 이름
 * @returns {MarketServer | null} 서버 정보 또는 null (찾지 못한 경우)
 */
export const getMarketServerByName = (name: string): MarketServer | null => {
  const servers = getMarketServers();
  return servers[name] || null;
};

/**
 * 모든 카테고리 목록 조회
 * 
 * 모든 마켓 서버에서 사용되는 카테고리들을 수집하여 정렬된 목록으로 반환합니다.
 * 중복 카테고리는 제거됩니다.
 * 
 * @returns {string[]} 정렬된 카테고리 목록
 */
export const getMarketCategories = (): string[] => {
  const servers = getMarketServers();
  const categories = new Set<string>();

  // 모든 서버의 카테고리 수집
  Object.values(servers).forEach((server) => {
    server.categories?.forEach((category) => {
      categories.add(category);
    });
  });

  return Array.from(categories).sort();
};

/**
 * 모든 태그 목록 조회
 * 
 * 모든 마켓 서버에서 사용되는 태그들을 수집하여 정렬된 목록으로 반환합니다.
 * 중복 태그는 제거됩니다.
 * 
 * @returns {string[]} 정렬된 태그 목록
 */
export const getMarketTags = (): string[] => {
  const servers = getMarketServers();
  const tags = new Set<string>();

  // 모든 서버의 태그 수집
  Object.values(servers).forEach((server) => {
    server.tags?.forEach((tag) => {
      tags.add(tag);
    });
  });

  return Array.from(tags).sort();
};

/**
 * 마켓 서버 검색
 * 
 * 검색 쿼리를 사용하여 마켓 서버를 검색합니다.
 * 서버 이름, 표시명, 설명, 카테고리, 태그에서 검색을 수행합니다.
 * 
 * @param {string} query - 검색 쿼리 (공백으로 구분된 검색어들)
 * @returns {MarketServer[]} 검색 조건에 맞는 서버 목록
 */
export const searchMarketServers = (query: string): MarketServer[] => {
  const servers = getMarketServers();
  
  // 검색어를 공백으로 분리하고 정리
  const searchTerms = query
    .toLowerCase()
    .split(' ')
    .filter((term) => term.length > 0);

  // 검색어가 없으면 모든 서버 반환
  if (searchTerms.length === 0) {
    return Object.values(servers);
  }

  return Object.values(servers).filter((server) => {
    // 검색 대상 텍스트 구성 (이름, 표시명, 설명, 카테고리, 태그)
    const searchableText = [
      server.name,
      server.display_name,
      server.description,
      ...(server.categories || []),
      ...(server.tags || []),
    ]
      .join(' ')
      .toLowerCase();

    // 검색어 중 하나라도 포함되면 결과에 포함
    return searchTerms.some((term) => searchableText.includes(term));
  });
};

/**
 * 카테고리별 마켓 서버 필터링
 * 
 * 지정된 카테고리에 속하는 마켓 서버들을 필터링하여 반환합니다.
 * 
 * @param {string} category - 필터링할 카테고리
 * @returns {MarketServer[]} 해당 카테고리의 서버 목록
 */
export const filterMarketServersByCategory = (category: string): MarketServer[] => {
  const servers = getMarketServers();

  // 카테고리가 지정되지 않으면 모든 서버 반환
  if (!category) {
    return Object.values(servers);
  }

  return Object.values(servers).filter((server) => {
    return server.categories?.includes(category);
  });
};

/**
 * 태그별 마켓 서버 필터링
 * 
 * 지정된 태그를 가진 마켓 서버들을 필터링하여 반환합니다.
 * 
 * @param {string} tag - 필터링할 태그
 * @returns {MarketServer[]} 해당 태그의 서버 목록
 */
export const filterMarketServersByTag = (tag: string): MarketServer[] => {
  const servers = getMarketServers();

  // 태그가 지정되지 않으면 모든 서버 반환
  if (!tag) {
    return Object.values(servers);
  }

  return Object.values(servers).filter((server) => {
    return server.tags?.includes(tag);
  });
};
