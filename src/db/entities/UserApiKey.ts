import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

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

    @ManyToOne('McpServer', 'userApiKeys', { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'serverId' })
    server!: any; // Type will be resolved at runtime

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
} 