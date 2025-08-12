import bcrypt from 'bcryptjs';
import { getAppDataSource } from '../db/connection.js';
import { User } from '../db/entities/User.js';
import { UserRepository } from '../db/repositories/UserRepository.js';

// UserRepository 인스턴스 (lazy initialization)
let userRepository: UserRepository | null = null;

const getUserRepository = (): UserRepository => {
  if (!userRepository) {
    userRepository = new UserRepository();
  }
  return userRepository;
};

// 사용자명으로 사용자 찾기 (DB 기반)
export const findUserByUsername = async (username: string): Promise<User | null> => {
  try {
    // 데이터베이스 초기화 확인
    const dataSource = getAppDataSource();
    if (!dataSource.isInitialized) {
      console.log('Database not initialized, cannot find user');
      return null;
    }

    const repo = getUserRepository();
    return await repo.findByUsername(username);
  } catch (error) {
    console.error('Error finding user by username:', error);
    return null;
  }
};

// 새 사용자 생성 (DB 기반)
export const createUser = async (userData: {
  username: string;
  password: string;
  isAdmin?: boolean;
  email?: string;
}): Promise<User | null> => {
  try {
    const repo = getUserRepository();

    // 사용자명 중복 체크
    const existingUser = await repo.findByUsername(userData.username);
    if (existingUser) {
      return null;
    }

    // 비밀번호 해시화
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    // 관리자 계정 생성
    const user = await repo.createLocalAdmin({
      username: userData.username,
      password: hashedPassword,
      email: userData.email
    });

    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
};

// Verify user password


// Verify user password
export const verifyPassword = async (
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

// Initialize with default admin user if no users exist (DB 기반)
export const initializeDefaultUser = async (): Promise<void> => {
  try {
    // DB 연결 대기
    const dataSource = getAppDataSource();
    if (!dataSource.isInitialized) {
      console.log('⏳ Waiting for database initialization...');
      return;
    }

    const repo = getUserRepository();

    // DB에서 관리자 계정 확인
    const existingAdmin = await repo.findByUsername('admin');

    if (!existingAdmin) {
      await createUser({
        username: 'admin',
        password: 'admin123',
        isAdmin: true,
        email: 'admin@mcphub.local'
      });
      console.log('✅ Default admin user created in database');
    } else {
      console.log('✅ Admin user already exists in database');
    }
  } catch (error) {
    console.error('❌ Error initializing default user:', error);
  }
};
