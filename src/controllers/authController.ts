/**
 * 인증 컨트롤러
 * 
 * 사용자 인증과 관련된 모든 API 엔드포인트를 처리합니다.
 * JWT 토큰 기반 인증을 사용하며, 로그인, 회원가입, 비밀번호 변경 등의 기능을 제공합니다.
 * 
 * 주요 기능:
 * - 사용자 로그인 및 JWT 토큰 발급
 * - 새 사용자 등록
 * - 현재 사용자 정보 조회
 * - 비밀번호 변경
 */

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { findUserByUsername, verifyPassword, createUser, updateUserPassword } from '../models/User.js';

/**
 * JWT 시크릿 키
 * 프로덕션 환경에서는 반드시 환경변수로 설정해야 합니다.
 */
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

/**
 * JWT 토큰 만료 시간 (24시간)
 */
const TOKEN_EXPIRY = '24h';

/**
 * 사용자 로그인 처리
 * 
 * 사용자명과 비밀번호를 검증하고 성공 시 JWT 토큰을 발급합니다.
 * 
 * @param {Request} req - Express 요청 객체 (username, password 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {Promise<void>} 로그인 결과 (토큰 및 사용자 정보 또는 오류)
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  // 요청 유효성 검사
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { username, password } = req.body;

  try {
    // 사용자명으로 사용자 찾기
    const user = findUserByUsername(username);
    
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    // 비밀번호 검증
    const isPasswordValid = await verifyPassword(password, user.password);
    
    if (!isPasswordValid) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    // JWT 토큰 페이로드 생성
    const payload = {
      user: {
        username: user.username,
        isAdmin: user.isAdmin || false
      }
    };

    // JWT 토큰 생성 및 발급
    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          success: true, 
          token,
          user: {
            username: user.username,
            isAdmin: user.isAdmin
          }
        });
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * 새 사용자 등록 처리
 * 
 * 새로운 사용자를 생성하고 성공 시 JWT 토큰을 발급합니다.
 * 
 * @param {Request} req - Express 요청 객체 (username, password, isAdmin 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {Promise<void>} 등록 결과 (토큰 및 사용자 정보 또는 오류)
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  // 요청 유효성 검사
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { username, password, isAdmin } = req.body;

  try {
    // 새 사용자 생성
    const newUser = await createUser({ username, password, isAdmin });
    
    if (!newUser) {
      res.status(400).json({ success: false, message: 'User already exists' });
      return;
    }

    // JWT 토큰 페이로드 생성
    const payload = {
      user: {
        username: newUser.username,
        isAdmin: newUser.isAdmin || false
      }
    };

    // JWT 토큰 생성 및 발급
    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          success: true, 
          token,
          user: {
            username: newUser.username,
            isAdmin: newUser.isAdmin
          }
        });
      }
    );
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * 현재 로그인한 사용자 정보 조회
 * 
 * 인증 미들웨어를 통해 검증된 사용자의 정보를 반환합니다.
 * 
 * @param {Request} req - Express 요청 객체 (인증된 사용자 정보 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {void} 사용자 정보 또는 오류
 */
export const getCurrentUser = (req: Request, res: Response): void => {
  try {
    // 인증 미들웨어에 의해 요청에 첨부된 사용자 정보
    const user = (req as any).user;
    
    res.json({ 
      success: true, 
      user: {
        username: user.username,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * 사용자 비밀번호 변경 처리
 * 
 * 현재 비밀번호를 확인한 후 새로운 비밀번호로 변경합니다.
 * 
 * @param {Request} req - Express 요청 객체 (currentPassword, newPassword 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {Promise<void>} 비밀번호 변경 결과 또는 오류
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  // 요청 유효성 검사
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { currentPassword, newPassword } = req.body;
  const username = (req as any).user.username;

  try {
    // 사용자명으로 사용자 찾기
    const user = findUserByUsername(username);
    
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // 현재 비밀번호 검증
    const isPasswordValid = await verifyPassword(currentPassword, user.password);
    
    if (!isPasswordValid) {
      res.status(401).json({ success: false, message: 'Current password is incorrect' });
      return;
    }

    // 새 비밀번호로 업데이트
    const updated = await updateUserPassword(username, newPassword);
    
    if (!updated) {
      res.status(500).json({ success: false, message: 'Failed to update password' });
      return;
    }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};