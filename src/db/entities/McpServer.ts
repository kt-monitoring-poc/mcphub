import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { McpServerEnvVar } from './McpServerEnvVar.js';
import { UserApiKey } from './UserApiKey.js';

export type McpServerType = 'stdio' | 'streamable-http' | 'sse';

@Entity('mcp_servers')
export class McpServer {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 100, unique: true })
    name!: string;

    @Column({ type: 'varchar', length: 200 })
    displayName!: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({
        type: 'enum',
        enum: ['stdio', 'streamable-http', 'sse'],
    })
    type!: McpServerType;

    @Column({ type: 'varchar', length: 200, nullable: true })
    command?: string;

    @Column({ type: 'jsonb', nullable: true })
    args?: string[];

    @Column({ type: 'varchar', length: 500, nullable: true })
    url?: string;

    @Column({ type: 'jsonb', nullable: true })
    headers?: Record<string, string>;

    @Column({ type: 'boolean', default: true })
    enabled!: boolean;

    @Column({ type: 'varchar', length: 100, nullable: true })
    groupName?: string;

    @Column({ type: 'int', default: 0 })
    sortOrder!: number;

    @Column({ type: 'boolean', default: false })
    isBuiltIn!: boolean;

    @OneToMany(() => McpServerEnvVar, envVar => envVar.server, { cascade: true })
    environmentVariables!: McpServerEnvVar[];

    @OneToMany(() => UserApiKey, userApiKey => userApiKey.server)
    userApiKeys!: UserApiKey[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
} 