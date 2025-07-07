/**
 * 그룹 관리 서비스
 * 
 * MCP 서버 그룹의 생성, 수정, 삭제, 조회 등의 비즈니스 로직을 처리합니다.
 * 서버들을 논리적으로 그룹화하여 관리할 수 있는 기능을 제공합니다.
 * 
 * 주요 기능:
 * - 그룹 CRUD 작업
 * - 그룹 내 서버 관리
 * - 서버 존재성 검증
 * - 그룹 이름 중복 검사
 * - 라우팅 설정에 따른 그룹 접근 제어
 */

import { v4 as uuidv4 } from 'uuid';
import { IGroup } from '../types/index.js';
import { loadSettings, saveSettings } from '../config/index.js';
import { notifyToolChanged } from './mcpService.js';

/**
 * 모든 그룹 조회
 * 
 * 시스템에 등록된 모든 서버 그룹의 목록을 반환합니다.
 * 
 * @returns {IGroup[]} 그룹 목록 (빈 배열일 수 있음)
 */
export const getAllGroups = (): IGroup[] => {
  const settings = loadSettings();
  return settings.groups || [];
};

/**
 * ID 또는 이름으로 그룹 조회
 * 
 * 그룹 ID 또는 이름으로 특정 그룹을 조회합니다.
 * 라우팅 설정에 따라 그룹 이름 기반 접근이 제한될 수 있습니다.
 * 
 * @param {string} key - 그룹 ID 또는 이름
 * @returns {IGroup | undefined} 그룹 정보 또는 undefined (찾지 못한 경우)
 */
export const getGroupByIdOrName = (key: string): IGroup | undefined => {
  const settings = loadSettings();
  const routingConfig = settings.systemConfig?.routing || {
    enableGlobalRoute: true,
    enableGroupNameRoute: true,
  };
  const groups = getAllGroups();
  
  return (
    groups.find(
      (group) => group.id === key || (group.name === key && routingConfig.enableGroupNameRoute),
    ) || undefined
  );
};

/**
 * 새 그룹 생성
 * 
 * 지정된 이름, 설명, 서버 목록으로 새로운 그룹을 생성합니다.
 * 그룹 이름 중복을 검사하고 유효한 서버만 포함합니다.
 * 
 * @param {string} name - 그룹 이름 (필수, 고유해야 함)
 * @param {string} [description] - 그룹 설명 (선택사항)
 * @param {string[]} [servers=[]] - 포함할 서버 이름 목록 (선택사항)
 * @returns {IGroup | null} 생성된 그룹 정보 또는 null (실패 시)
 */
export const createGroup = (
  name: string,
  description?: string,
  servers: string[] = [],
): IGroup | null => {
  try {
    const settings = loadSettings();
    const groups = settings.groups || [];

    // 동일한 이름의 그룹이 이미 존재하는지 확인
    if (groups.some((group) => group.name === name)) {
      return null;
    }

    // 존재하지 않는 서버 필터링
    const validServers = servers.filter((serverName) => settings.mcpServers[serverName]);

    const newGroup: IGroup = {
      id: uuidv4(),
      name,
      description,
      servers: validServers,
    };

    // 그룹 배열이 없는 경우 초기화
    if (!settings.groups) {
      settings.groups = [];
    }

    settings.groups.push(newGroup);

    if (!saveSettings(settings)) {
      return null;
    }

    return newGroup;
  } catch (error) {
    console.error('Failed to create group:', error);
    return null;
  }
};

/**
 * 기존 그룹 업데이트
 * 
 * 그룹의 이름, 설명, 서버 목록을 수정합니다.
 * 제공된 필드만 업데이트되며, 나머지는 기존 값을 유지합니다.
 * 
 * @param {string} id - 수정할 그룹 ID
 * @param {Partial<IGroup>} data - 업데이트할 데이터 (부분 업데이트 가능)
 * @returns {IGroup | null} 업데이트된 그룹 정보 또는 null (실패 시)
 */
export const updateGroup = (id: string, data: Partial<IGroup>): IGroup | null => {
  try {
    const settings = loadSettings();
    if (!settings.groups) {
      return null;
    }

    const groupIndex = settings.groups.findIndex((group) => group.id === id);
    if (groupIndex === -1) {
      return null;
    }

    // 이름이 변경되는 경우 중복 검사
    if (data.name && settings.groups.some((g) => g.name === data.name && g.id !== id)) {
      return null;
    }

    // 서버 배열이 제공된 경우 서버 존재성 검증
    if (data.servers) {
      data.servers = data.servers.filter((serverName) => settings.mcpServers[serverName]);
    }

    const updatedGroup = {
      ...settings.groups[groupIndex],
      ...data,
    };

    settings.groups[groupIndex] = updatedGroup;

    if (!saveSettings(settings)) {
      return null;
    }

    // 도구 목록 변경 알림
    notifyToolChanged();
    return updatedGroup;
  } catch (error) {
    console.error(`Failed to update group ${id}:`, error);
    return null;
  }
};

/**
 * 그룹 내 서버 목록 배치 업데이트
 * 
 * 그룹의 전체 서버 목록을 한 번에 교체합니다.
 * 기존 서버들은 모두 제거되고 새로운 서버 목록으로 대체됩니다.
 * 
 * @param {string} groupId - 대상 그룹 ID
 * @param {string[]} servers - 새로운 서버 목록
 * @returns {IGroup | null} 업데이트된 그룹 정보 또는 null (실패 시)
 */
export const updateGroupServers = (groupId: string, servers: string[]): IGroup | null => {
  try {
    const settings = loadSettings();
    if (!settings.groups) {
      return null;
    }

    const groupIndex = settings.groups.findIndex((group) => group.id === groupId);
    if (groupIndex === -1) {
      return null;
    }

    // 존재하지 않는 서버 필터링
    const validServers = servers.filter((serverName) => settings.mcpServers[serverName]);

    settings.groups[groupIndex].servers = validServers;

    if (!saveSettings(settings)) {
      return null;
    }

    // 도구 목록 변경 알림
    notifyToolChanged();
    return settings.groups[groupIndex];
  } catch (error) {
    console.error(`Failed to update servers for group ${groupId}:`, error);
    return null;
  }
};

/**
 * 그룹 삭제
 * 
 * 지정된 ID의 그룹을 시스템에서 완전히 제거합니다.
 * 
 * @param {string} id - 삭제할 그룹 ID
 * @returns {boolean} 삭제 성공 여부
 */
export const deleteGroup = (id: string): boolean => {
  try {
    const settings = loadSettings();
    if (!settings.groups) {
      return false;
    }

    const initialLength = settings.groups.length;
    settings.groups = settings.groups.filter((group) => group.id !== id);

    // 실제로 삭제된 그룹이 있는지 확인
    if (settings.groups.length === initialLength) {
      return false;
    }

    return saveSettings(settings);
  } catch (error) {
    console.error(`Failed to delete group ${id}:`, error);
    return false;
  }
};

/**
 * 그룹에 서버 추가
 * 
 * 지정된 그룹에 새로운 서버를 추가합니다.
 * 이미 그룹에 포함된 서버인 경우 중복 추가되지 않습니다.
 * 
 * @param {string} groupId - 대상 그룹 ID
 * @param {string} serverName - 추가할 서버 이름
 * @returns {IGroup | null} 업데이트된 그룹 정보 또는 null (실패 시)
 */
export const addServerToGroup = (groupId: string, serverName: string): IGroup | null => {
  try {
    const settings = loadSettings();
    if (!settings.groups) {
      return null;
    }

    // 서버 존재성 검증
    if (!settings.mcpServers[serverName]) {
      return null;
    }

    const groupIndex = settings.groups.findIndex((group) => group.id === groupId);
    if (groupIndex === -1) {
      return null;
    }

    const group = settings.groups[groupIndex];

    // 이미 그룹에 포함되지 않은 경우에만 추가
    if (!group.servers.includes(serverName)) {
      group.servers.push(serverName);

      if (!saveSettings(settings)) {
        return null;
      }
    }

    // 도구 목록 변경 알림
    notifyToolChanged();
    return group;
  } catch (error) {
    console.error(`Failed to add server ${serverName} to group ${groupId}:`, error);
    return null;
  }
};

/**
 * 그룹에서 서버 제거
 * 
 * 지정된 그룹에서 특정 서버를 제거합니다.
 * 
 * @param {string} groupId - 대상 그룹 ID
 * @param {string} serverName - 제거할 서버 이름
 * @returns {IGroup | null} 업데이트된 그룹 정보 또는 null (실패 시)
 */
export const removeServerFromGroup = (groupId: string, serverName: string): IGroup | null => {
  try {
    const settings = loadSettings();
    if (!settings.groups) {
      return null;
    }

    const groupIndex = settings.groups.findIndex((group) => group.id === groupId);
    if (groupIndex === -1) {
      return null;
    }

    const group = settings.groups[groupIndex];
    group.servers = group.servers.filter((name) => name !== serverName);

    if (!saveSettings(settings)) {
      return null;
    }

    return group;
  } catch (error) {
    console.error(`Failed to remove server ${serverName} from group ${groupId}:`, error);
    return null;
  }
};

/**
 * 그룹 내 모든 서버 조회
 * 
 * 지정된 그룹에 포함된 모든 서버의 이름 목록을 반환합니다.
 * 
 * @param {string} groupId - 조회할 그룹 ID
 * @returns {string[]} 그룹 내 서버 이름 목록 (빈 배열일 수 있음)
 */
export const getServersInGroup = (groupId: string): string[] => {
  const group = getGroupByIdOrName(groupId);
  return group ? group.servers : [];
};
