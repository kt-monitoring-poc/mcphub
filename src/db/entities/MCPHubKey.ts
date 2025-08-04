import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User.js';

@Entity('mcphub_keys')
export class MCPHubKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  keyValue: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'jsonb', nullable: true })
  serviceTokens?: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user: any) => user.id)
  @JoinColumn({ name: 'userId' })
  user: User;

  // 키가 만료되었는지 확인
  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  // 키가 유효한지 확인 (활성화 상태 + 미만료)
  get isValid(): boolean {
    return this.isActive && !this.isExpired;
  }

  // 만료까지 남은 일수 계산
  get daysUntilExpiry(): number {
    const now = new Date();
    const diffTime = this.expiresAt.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
} 