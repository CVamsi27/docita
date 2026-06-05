import { Injectable, BadRequestException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

interface VerifiedToken {
  type: string;
  id: string;
}

function base64url(input: Buffer): string {
  return input
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '=',
  );
  return Buffer.from(padded, 'base64');
}

@Injectable()
export class PublicDocumentTokenService {
  private readonly secret: string;

  constructor(configService: AppConfigService) {
    this.secret = configService.getPublicDocumentSigningSecret();
  }

  sign(type: string, id: string): string {
    const payload = `${type}:${id}`;
    const hmac = createHmac('sha256', this.secret).update(payload).digest();

    return `${base64url(Buffer.from(payload))}.${base64url(hmac)}`;
  }

  verify(token: string): VerifiedToken {
    const dotIndex = token.lastIndexOf('.');
    if (dotIndex === -1) {
      throw new BadRequestException('Invalid document token format');
    }

    const encodedPayload = token.slice(0, dotIndex);
    const encodedSignature = token.slice(dotIndex + 1);

    if (!encodedPayload || !encodedSignature) {
      throw new BadRequestException('Invalid document token format');
    }

    let payload: string;
    try {
      payload = base64urlDecode(encodedPayload).toString('utf8');
    } catch {
      throw new BadRequestException('Invalid document token encoding');
    }

    const colonIndex = payload.indexOf(':');
    if (colonIndex === -1) {
      throw new BadRequestException('Invalid document token payload');
    }

    const type = payload.slice(0, colonIndex);
    const id = payload.slice(colonIndex + 1);

    if (!type || !id) {
      throw new BadRequestException('Invalid document token payload');
    }

    const expectedHmac = createHmac('sha256', this.secret)
      .update(payload)
      .digest();

    let actualHmac: Buffer;
    try {
      actualHmac = base64urlDecode(encodedSignature);
    } catch {
      throw new BadRequestException('Invalid document token signature');
    }

    if (
      expectedHmac.length !== actualHmac.length ||
      !timingSafeEqual(expectedHmac, actualHmac)
    ) {
      throw new BadRequestException('Invalid document token signature');
    }

    return { type, id };
  }
}
