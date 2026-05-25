import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import * as crypto from 'crypto';
import { nanoid } from 'nanoid';
import { PrismaService } from '@/prisma/prisma.service';

const API_KEY_PREFIX = 'dct_';
const API_KEY_BYTES = 32;

export interface CreateApiKeyDto {
  name: string;
  scopes: string[];
  expiresAt?: Date;
}

export interface ApiKeyWithSecret {
  id: string;
  name: string;
  key: string;
  keyPrefix: string;
  scopes: string[];
  expiresAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async createApiKey(
    clinicId: string,
    createdById: string,
    dto: CreateApiKeyDto,
  ): Promise<ApiKeyWithSecret> {
    const rawKey = `${API_KEY_PREFIX}${nanoid(API_KEY_BYTES)}`;
    const keyHash = this.hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, API_KEY_PREFIX.length + 8);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        clinicId,
        createdById,
        name: dto.name,
        keyHash,
        keyPrefix,
        scopes: dto.scopes,
        expiresAt: dto.expiresAt ?? null,
        updatedAt: this.clock.now(),
      },
    });

    this.logger.log('API key created', {
      clinicId,
      createdById,
      name: dto.name,
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey,
      keyPrefix,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  async listApiKeys(clinicId: string) {
    return this.prisma.apiKey.findMany({
      where: { clinicId, revokedAt: null },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeApiKey(id: string, clinicId: string): Promise<void> {
    const apiKey = await this.prisma.apiKey.findUnique({ where: { id } });

    if (!apiKey || apiKey.clinicId !== clinicId) {
      throw new NotFoundException('API key not found');
    }

    if (apiKey.revokedAt) {
      throw new ForbiddenException('API key is already revoked');
    }

    await this.prisma.apiKey.update({
      where: { id },
      data: {
        revokedAt: this.clock.now(),
        updatedAt: this.clock.now(),
      },
    });

    this.logger.log('API key revoked', { id, clinicId });
  }

  async validateApiKey(
    rawKey: string,
  ): Promise<{ clinicId: string; scopes: string[] } | null> {
    if (!rawKey.startsWith(API_KEY_PREFIX)) {
      return null;
    }

    const keyHash = this.hashKey(rawKey);

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      select: {
        id: true,
        clinicId: true,
        scopes: true,
        revokedAt: true,
        expiresAt: true,
      },
    });

    if (!apiKey || apiKey.revokedAt) {
      return null;
    }

    if (apiKey.expiresAt && apiKey.expiresAt < this.clock.now()) {
      return null;
    }

    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: this.clock.now(),
        updatedAt: this.clock.now(),
      },
    });

    return { clinicId: apiKey.clinicId, scopes: apiKey.scopes };
  }

  private hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }
}
