import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('user_tokens')
@Index(['userId', 'tokenType'], { unique: true })
export class UserToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 50 })
  tokenType!: string; // 'github', 'openai', etc.

  @Column({ type: 'text' })
  encryptedToken!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tokenName?: string; // 사용자가 지정한 토큰 이름

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUsed?: Date;
} 