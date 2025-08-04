import crypto from 'crypto';
import { UserApiKey } from '../entities/UserApiKey.js';
import { BaseRepository } from './BaseRepository.js';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'mcphub-default-key-change-this-32chars';
const IV_LENGTH = 16; // For AES, this is always 16

export interface CreateUserApiKeyData {
    userId: number;
    serverId: number;
    varName: string;
    value: string;
}

export interface UpdateUserApiKeyData {
    value: string;
}

export class UserApiKeyRepository extends BaseRepository<UserApiKey> {
    constructor() {
        super(UserApiKey);
    }

    private encrypt(text: string): string {
        const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    private decrypt(text: string): string {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift()!, 'hex');
        const encryptedText = textParts.join(':');
        const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    async findByUserAndServer(userId: number, serverId: number): Promise<UserApiKey[]> {
        return this.repository.find({
            where: { userId, serverId },
            relations: ['server']
        });
    }

    async findByUserServerAndVar(userId: number, serverId: number, varName: string): Promise<UserApiKey | null> {
        return this.repository.findOne({
            where: { userId, serverId, varName },
            relations: ['server']
        });
    }

    async findByUser(userId: number): Promise<UserApiKey[]> {
        return this.repository.find({
            where: { userId },
            relations: ['server']
        });
    }

    async createApiKey(data: CreateUserApiKeyData): Promise<UserApiKey> {
        const encryptedValue = this.encrypt(data.value);

        const apiKey = this.repository.create({
            userId: data.userId,
            serverId: data.serverId,
            varName: data.varName,
            encryptedValue
        });

        return this.repository.save(apiKey);
    }

    async updateApiKey(userId: number, serverId: number, varName: string, data: UpdateUserApiKeyData): Promise<UserApiKey | null> {
        const apiKey = await this.findByUserServerAndVar(userId, serverId, varName);
        if (!apiKey) {
            return null;
        }

        apiKey.encryptedValue = this.encrypt(data.value);
        return this.repository.save(apiKey);
    }

    async deleteApiKey(userId: number, serverId: number, varName: string): Promise<boolean> {
        const result = await this.repository.delete({
            userId,
            serverId,
            varName
        });

        return result.affected ? result.affected > 0 : false;
    }

    async deleteAllByServer(serverId: number): Promise<number> {
        const result = await this.repository.delete({ serverId });
        return result.affected || 0;
    }

    async deleteAllByUser(userId: number): Promise<number> {
        const result = await this.repository.delete({ userId });
        return result.affected || 0;
    }

    async getDecryptedValue(apiKey: UserApiKey): Promise<string> {
        return this.decrypt(apiKey.encryptedValue);
    }

    async getUserApiKeysForServer(userId: number, serverId: number): Promise<Record<string, string>> {
        const apiKeys = await this.findByUserAndServer(userId, serverId);
        const result: Record<string, string> = {};

        for (const apiKey of apiKeys) {
            result[apiKey.varName] = await this.getDecryptedValue(apiKey);
        }

        return result;
    }

    async setUserApiKey(userId: number, serverId: number, varName: string, value: string): Promise<UserApiKey> {
        const existing = await this.findByUserServerAndVar(userId, serverId, varName);

        if (existing) {
            return this.updateApiKey(userId, serverId, varName, { value }) as Promise<UserApiKey>;
        } else {
            return this.createApiKey({ userId, serverId, varName, value });
        }
    }
} 