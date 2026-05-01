import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UploadsService } from '@/domains/documents/application/services/uploads.service';

@Injectable()
export class UploadSessionSecretGuard implements CanActivate {
  constructor(private readonly uploadsService: UploadsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      params?: Record<string, string>;
      headers: Record<string, string | string[] | undefined>;
    }>();

    const rawId = req.params?.['id'];
    const id = typeof rawId === 'string' ? rawId.trim() : '';
    if (!id) {
      throw new BadRequestException('Upload session id is required');
    }

    const rawSecret = req.headers['x-upload-secret'];
    const uploadSecretHeader = Array.isArray(rawSecret)
      ? rawSecret[0]
      : rawSecret;
    const uploadSecret =
      typeof uploadSecretHeader === 'string' ? uploadSecretHeader.trim() : '';

    if (!uploadSecret) {
      throw new UnauthorizedException('X-Upload-Secret header is required');
    }

    await this.uploadsService.assertReadyForUpload(id, uploadSecret);

    return true;
  }
}
