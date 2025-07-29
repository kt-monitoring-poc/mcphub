import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { McpServer } from './McpServer.js';

@Entity('user_api_keys')
@Index(['userId', 'serverId', 'varName'], { unique: true })
export class UserApiKey {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'int' })
    userId!: number;

    @Column({ type: 'int' })
    serverId!: number;

    @Column({ type: 'varchar', length: 100 })
    varName!: string;

    @Column({ type: 'text' })
    encryptedValue!: string;

    @ManyToOne(() => McpServer, server => server.userApiKeys, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'serverId' })
    server!: McpServer;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
} 