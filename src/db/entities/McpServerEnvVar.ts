import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('mcp_server_env_vars')
export class McpServerEnvVar {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'int' })
    serverId!: number;

    @Column({ type: 'varchar', length: 100 })
    varName!: string;

    @Column({ type: 'varchar', length: 200 })
    displayName!: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'boolean', default: true })
    required!: boolean;

    @Column({ type: 'boolean', default: true })
    isSecret!: boolean;

    @Column({ type: 'text', nullable: true })
    defaultValue?: string;

    @Column({ type: 'varchar', length: 200, nullable: true })
    validationRegex?: string;

    @Column({ type: 'int', default: 0 })
    sortOrder!: number;

    @ManyToOne('McpServer', 'environmentVariables', { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'serverId' })
    server!: any; // Type will be resolved at runtime

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
} 