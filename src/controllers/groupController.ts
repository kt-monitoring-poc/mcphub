/**
 * 그룹 관리 컨트롤러
 * 
 * MCP 서버 그룹의 생성, 수정, 삭제, 조회 및 관리와 관련된 모든 API 엔드포인트를 처리합니다.
 * 서버들을 논리적으로 그룹화하여 관리할 수 있는 기능을 제공합니다.
 * 
 * 주요 기능:
 * - 그룹 CRUD 작업
 * - 그룹 내 서버 관리 (추가/제거)
 * - 그룹별 서버 목록 조회
 * - 배치 서버 업데이트
 */

import { Request, Response } from 'express';
import { ApiResponse } from '../types/index.js';
import {
  getAllGroups,
  getGroupByIdOrName,
  createGroup,
  updateGroup,
  updateGroupServers,
  deleteGroup,
  addServerToGroup,
  removeServerFromGroup,
} from '../services/groupService.js';

/**
 * 모든 그룹 정보 조회
 * 
 * 시스템에 등록된 모든 서버 그룹의 목록을 반환합니다.
 * 
 * @param {Request} _ - Express 요청 객체 (사용하지 않음)
 * @param {Response} res - Express 응답 객체
 * @returns {void} 그룹 목록 또는 오류
 */
export const getGroups = (_: Request, res: Response): void => {
  try {
    const groups = getAllGroups();
    const response: ApiResponse = {
      success: true,
      data: groups,
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get groups information',
    });
  }
};

/**
 * 특정 그룹 정보 조회
 * 
 * ID 또는 이름으로 지정된 그룹의 상세 정보를 반환합니다.
 * 
 * @param {Request} req - Express 요청 객체 (id 매개변수 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {void} 그룹 정보 또는 오류
 */
export const getGroup = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Group ID is required',
      });
      return;
    }

    const group = getGroupByIdOrName(id);
    if (!group) {
      res.status(404).json({
        success: false,
        message: 'Group not found',
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: group,
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get group information',
    });
  }
};

/**
 * 새 그룹 생성
 * 
 * 지정된 이름, 설명, 서버 목록으로 새로운 그룹을 생성합니다.
 * 
 * @param {Request} req - Express 요청 객체 (name, description, servers 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {void} 생성된 그룹 정보 또는 오류
 */
export const createNewGroup = (req: Request, res: Response): void => {
  try {
    const { name, description, servers } = req.body;
    
    // 그룹 이름 필수 검사
    if (!name) {
      res.status(400).json({
        success: false,
        message: 'Group name is required',
      });
      return;
    }

    // 서버 목록 유효성 검사 (배열이 아닌 경우 빈 배열로 설정)
    const serverList = Array.isArray(servers) ? servers : [];
    const newGroup = createGroup(name, description, serverList);
    
    if (!newGroup) {
      res.status(400).json({
        success: false,
        message: 'Failed to create group or group name already exists',
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: newGroup,
      message: 'Group created successfully',
    };
    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * 기존 그룹 정보 업데이트
 * 
 * 그룹의 이름, 설명, 서버 목록을 수정합니다.
 * 제공된 필드만 업데이트되며, 나머지는 기존 값을 유지합니다.
 * 
 * @param {Request} req - Express 요청 객체 (id 매개변수 및 name, description, servers 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {void} 업데이트된 그룹 정보 또는 오류
 */
export const updateExistingGroup = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { name, description, servers } = req.body;
    
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Group ID is required',
      });
      return;
    }

    // 업데이트할 필드들을 동적으로 구성
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (servers !== undefined) updateData.servers = servers;

    // 최소 하나의 필드는 업데이트되어야 함
    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: 'At least one field (name, description, or servers) is required to update',
      });
      return;
    }

    const updatedGroup = updateGroup(id, updateData);
    if (!updatedGroup) {
      res.status(404).json({
        success: false,
        message: 'Group not found or name already exists',
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: updatedGroup,
      message: 'Group updated successfully',
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * 그룹 내 서버 목록 배치 업데이트
 * 
 * 그룹의 전체 서버 목록을 한 번에 교체합니다.
 * 기존 서버들은 모두 제거되고 새로운 서버 목록으로 대체됩니다.
 * 
 * @param {Request} req - Express 요청 객체 (id 매개변수 및 servers 배열 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {void} 업데이트된 그룹 정보 또는 오류
 */
export const updateGroupServersBatch = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { servers } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Group ID is required',
      });
      return;
    }

    // 서버 목록이 배열인지 검사
    if (!Array.isArray(servers)) {
      res.status(400).json({
        success: false,
        message: 'Servers must be an array of server names',
      });
      return;
    }

    const updatedGroup = updateGroupServers(id, servers);
    if (!updatedGroup) {
      res.status(404).json({
        success: false,
        message: 'Group not found',
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: updatedGroup,
      message: 'Group servers updated successfully',
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * 그룹 삭제
 * 
 * 지정된 ID의 그룹을 시스템에서 완전히 제거합니다.
 * 
 * @param {Request} req - Express 요청 객체 (id 매개변수 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {void} 삭제 성공 메시지 또는 오류
 */
export const deleteExistingGroup = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Group ID is required',
      });
      return;
    }

    const success = deleteGroup(id);
    if (!success) {
      res.status(404).json({
        success: false,
        message: 'Group not found or failed to delete',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Group deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * 그룹에 서버 추가
 * 
 * 지정된 그룹에 새로운 서버를 추가합니다.
 * 이미 그룹에 포함된 서버인 경우 중복 추가되지 않습니다.
 * 
 * @param {Request} req - Express 요청 객체 (id 매개변수 및 serverName 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {void} 업데이트된 그룹 정보 또는 오류
 */
export const addServerToExistingGroup = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { serverName } = req.body;
    
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Group ID is required',
      });
      return;
    }

    if (!serverName) {
      res.status(400).json({
        success: false,
        message: 'Server name is required',
      });
      return;
    }

    const updatedGroup = addServerToGroup(id, serverName);
    if (!updatedGroup) {
      res.status(404).json({
        success: false,
        message: 'Group or server not found',
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: updatedGroup,
      message: 'Server added to group successfully',
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * 그룹에서 서버 제거
 * 
 * 지정된 그룹에서 특정 서버를 제거합니다.
 * 
 * @param {Request} req - Express 요청 객체 (id, serverName 매개변수 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {void} 업데이트된 그룹 정보 또는 오류
 */
export const removeServerFromExistingGroup = (req: Request, res: Response): void => {
  try {
    const { id, serverName } = req.params;
    if (!id || !serverName) {
      res.status(400).json({
        success: false,
        message: 'Group ID and server name are required',
      });
      return;
    }

    const updatedGroup = removeServerFromGroup(id, serverName);
    if (!updatedGroup) {
      res.status(404).json({
        success: false,
        message: 'Group not found',
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: updatedGroup,
      message: 'Server removed from group successfully',
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * 그룹 내 서버 목록 조회
 * 
 * 지정된 그룹에 포함된 모든 서버의 목록을 반환합니다.
 * 
 * @param {Request} req - Express 요청 객체 (id 매개변수 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {void} 서버 목록 또는 오류
 */
export const getGroupServers = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Group ID is required',
      });
      return;
    }

    const group = getGroupByIdOrName(id);
    if (!group) {
      res.status(404).json({
        success: false,
        message: 'Group not found',
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: group.servers,
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get group servers',
    });
  }
};
