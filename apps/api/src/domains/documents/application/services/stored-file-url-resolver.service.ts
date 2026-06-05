import { Injectable } from '@nestjs/common';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  GENERIC_STORED_FILE_SIGNED_URL_TTL_SECONDS,
  StorageProvider,
} from '@/domains/documents/application/ports/storage-provider.port';

export interface ResolvedStoredFileUrl {
  url: string | null;
  storedUrl: string | null;
}

function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function isBrowserDataUrl(value: string): boolean {
  return /^data:/i.test(value) || /^blob:/i.test(value);
}

@Injectable()
export class StoredFileUrlResolverService {
  constructor(
    private readonly storageProvider: StorageProvider,
    private readonly configService: AppConfigService,
  ) {}

  private getApiOrigin(): string {
    try {
      return new URL(this.configService.getApiUrl()).origin;
    } catch {
      return this.configService.getApiUrl();
    }
  }

  private toAbsoluteApiUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.getApiOrigin()}${normalizedPath}`;
  }

  async resolve(url: string | null | undefined): Promise<string | null> {
    return (await this.resolveWithStoredUrl(url)).url;
  }

  async resolveWithStoredUrl(
    url: string | null | undefined,
  ): Promise<ResolvedStoredFileUrl> {
    if (typeof url !== 'string') {
      return { url: null, storedUrl: null };
    }

    const trimmed = url.trim();
    if (!trimmed) {
      return { url: null, storedUrl: null };
    }

    if (isAbsoluteHttpUrl(trimmed) || isBrowserDataUrl(trimmed)) {
      return { url: trimmed, storedUrl: trimmed };
    }

    if (trimmed.startsWith('/uploads/')) {
      return {
        url: this.toAbsoluteApiUrl(trimmed),
        storedUrl: trimmed,
      };
    }

    if (trimmed.startsWith('uploads/')) {
      const normalizedPath = `/${trimmed}`;
      return {
        url: this.toAbsoluteApiUrl(normalizedPath),
        storedUrl: normalizedPath,
      };
    }

    if (trimmed.startsWith('/')) {
      return {
        url: this.toAbsoluteApiUrl(trimmed),
        storedUrl: trimmed,
      };
    }

    if (this.storageProvider.supportsSignedUrls) {
      return {
        url: await this.storageProvider.generateSignedUrl(
          trimmed,
          GENERIC_STORED_FILE_SIGNED_URL_TTL_SECONDS,
        ),
        storedUrl: trimmed,
      };
    }

    return {
      url: this.toAbsoluteApiUrl(`/uploads/${trimmed}`),
      storedUrl: trimmed,
    };
  }
}
