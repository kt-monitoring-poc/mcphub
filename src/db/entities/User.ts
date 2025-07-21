import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * 사용자 엔티티
 * 시스템 사용자의 기본 정보와 인증 정보를 관리합니다.
 */
@Entity('users')
export class User {
  /**
   * 사용자 고유 ID (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 사용자명 (고유)
   */
  @Column({ type: 'varchar', length: 50, unique: true })
  @Index()
  username!: string;

  /**
   * 이메일 주소 (선택적, 고유)
   */
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  @Index()
  email?: string;

  /**
   * 비밀번호 해시
   */
  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  /**
   * 관리자 권한 여부
   */
  @Column({ type: 'boolean', default: false })
  isAdmin!: boolean;

  /**
   * 계정 활성화 상태
   */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * 마지막 로그인 시간
   */
  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  /**
   * 생성 시간
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * 수정 시간
   */
  @UpdateDateColumn()
  updatedAt!: Date;
} 