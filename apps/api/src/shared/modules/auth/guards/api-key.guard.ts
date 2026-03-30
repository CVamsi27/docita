import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiKeyService } from '@/shared/modules/auth/auth/api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authHeader: string | undefined = request.headers['authorization'];
    if (!authHeader?.startsWith('ApiKey ')) {
      throw new UnauthorizedException('API key required');
    }

    const rawKey = authHeader.substring('ApiKey '.length).trim();

    const result = await this.apiKeyService.validateApiKey(rawKey);

    if (!result) {
      throw new UnauthorizedException('Invalid or revoked API key');
    }

    request.apiKeyClinicId = result.clinicId;
    request.apiKeyScopes = result.scopes;

    return true;
  }
}
