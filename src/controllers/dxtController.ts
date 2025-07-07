/**
 * DXT 파일 관리 컨트롤러
 * 
 * DXT (Dynamic eXtensible Tools) 파일의 업로드, 추출, 설치와 관련된 API 엔드포인트를 처리합니다.
 * DXT 파일은 MCP 서버를 패키징한 ZIP 아카이브 형태입니다.
 * 
 * 주요 기능:
 * - DXT 파일 업로드 및 검증
 * - DXT 파일 추출 및 설치
 * - 매니페스트 파일 검증
 * - 이전 버전 정리 및 버전 관리
 */

import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import { ApiResponse } from '../types/index.js';

/**
 * ESM 환경에서 __dirname 얻기
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * DXT 파일 업로드를 위한 multer 설정
 * 
 * - 저장 위치: data/uploads/dxt
 * - 파일명: 원본명-타임스탬프.dxt
 * - 파일 크기 제한: 100MB
 * - 허용 확장자: .dxt만 허용
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../data/uploads/dxt');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = path.parse(file.originalname).name;
    cb(null, `${originalName}-${timestamp}.dxt`);
  },
});

/**
 * Multer 인스턴스 설정
 * DXT 파일만 허용하고 크기 제한을 적용합니다.
 */
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.dxt')) {
      cb(null, true);
    } else {
      cb(new Error('Only .dxt files are allowed'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB 제한
  },
});

/**
 * 파일 업로드 미들웨어
 * 단일 DXT 파일 업로드를 처리합니다.
 */
export const uploadMiddleware = upload.single('dxtFile');

/**
 * 이전 버전의 DXT 서버 파일 정리
 * 
 * 새 버전을 설치할 때 동일한 이름의 기존 서버 디렉토리를 삭제합니다.
 * 자동 버전 관리를 위해 사용됩니다.
 * 
 * @param {string} serverName - 정리할 서버 이름
 * @returns {void}
 */
const cleanupOldDxtServer = (serverName: string): void => {
  try {
    const uploadDir = path.join(__dirname, '../../data/uploads/dxt');
    const serverPattern = `server-${serverName}`;

    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      files.forEach((file) => {
        if (file.startsWith(serverPattern)) {
          const filePath = path.join(uploadDir, file);
          if (fs.statSync(filePath).isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
            console.log(`Cleaned up old DXT server directory: ${filePath}`);
          }
        }
      });
    }
  } catch (error) {
    console.warn('Failed to cleanup old DXT server files:', error);
    // 정리 실패 시에도 설치는 계속 진행
  }
};

/**
 * DXT 파일 업로드 및 설치 처리
 * 
 * 업로드된 DXT 파일을 검증하고 추출하여 설치합니다.
 * 다음 단계를 순차적으로 수행합니다:
 * 1. 업로드된 파일 검증
 * 2. ZIP 아카이브 추출
 * 3. manifest.json 검증
 * 4. 이전 버전 정리
 * 5. 최종 위치로 이동
 * 
 * @param {Request} req - Express 요청 객체 (업로드된 파일 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {Promise<void>} 설치 결과 또는 오류
 */
export const uploadDxtFile = async (req: Request, res: Response): Promise<void> => {
  try {
    // 업로드된 파일 확인
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No DXT file uploaded',
      });
      return;
    }

    const dxtFilePath = req.file.path;
    const timestamp = Date.now();
    const tempExtractDir = path.join(path.dirname(dxtFilePath), `temp-extracted-${timestamp}`);

    try {
      // DXT 파일(ZIP 아카이브)을 임시 디렉토리에 추출
      const zip = new AdmZip(dxtFilePath);
      zip.extractAllTo(tempExtractDir, true);

      // manifest.json 읽기 및 검증
      const manifestPath = path.join(tempExtractDir, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        throw new Error('manifest.json not found in DXT file');
      }

      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);

      // 매니페스트 필수 필드 검증
      if (!manifest.dxt_version) {
        throw new Error('Invalid manifest: missing dxt_version');
      }
      if (!manifest.name) {
        throw new Error('Invalid manifest: missing name');
      }
      if (!manifest.version) {
        throw new Error('Invalid manifest: missing version');
      }
      if (!manifest.server) {
        throw new Error('Invalid manifest: missing server configuration');
      }

      // 자동 버전 관리를 위한 최종 추출 디렉토리 설정
      const finalExtractDir = path.join(path.dirname(dxtFilePath), `server-${manifest.name}`);

      // 기존 버전 정리
      cleanupOldDxtServer(manifest.name);

      // 임시 디렉토리를 최종 위치로 이동
      fs.renameSync(tempExtractDir, finalExtractDir);
      console.log(`DXT server extracted to: ${finalExtractDir}`);

      // 업로드된 DXT 파일 정리
      fs.unlinkSync(dxtFilePath);

      const response: ApiResponse = {
        success: true,
        data: {
          manifest,
          extractDir: finalExtractDir,
        },
      };

      res.json(response);
    } catch (extractError) {
      // 오류 발생 시 파일 정리
      if (fs.existsSync(dxtFilePath)) {
        fs.unlinkSync(dxtFilePath);
      }
      if (fs.existsSync(tempExtractDir)) {
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
      }
      throw extractError;
    }
  } catch (error) {
    console.error('DXT upload error:', error);

    let message = 'Failed to process DXT file';
    if (error instanceof Error) {
      message = error.message;
    }

    res.status(500).json({
      success: false,
      message,
    });
  }
};
