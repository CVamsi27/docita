import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyService } from '@/shared/modules/auth/auth/api-key.service';
import { API_KEY_SCOPES_METADATA } from './api-key-scope.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authHeader: string | undefined = request.headers['authorization'];
    if (!authHeader?.startsWith('ApiKey ')) {
      throw new UnauthorizedException('API key required');
    }

    const rawKey = authHeader.substring('ApiKey '.length).trim();

    const result = await this.apiKeyService.validateApiKey(rawKey, request.ip);

    if (!result) throw new UnauthorizedException('Invalid or revoked API key');

    request.apiKeyClinicId = result.clinicId;
    request.apiKeyScopes = result.scopes;

    const requiredScopes =
      this.reflector.getAllAndOverride<string[]>(API_KEY_SCOPES_METADATA, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const missingScopes = requiredScopes.filter(
      (scope) => !this.grantsScope(result.scopes, scope),
    );
    if (missingScopes.length > 0)
      throw new ForbiddenException('API key does not grant required scope');

    return true;
  }

  private grantsScope(grantedScopes: string[], requiredScope: string): boolean {
    const separatorIndex = requiredScope.indexOf(':');
    const wildcard =
      separatorIndex > 0
        ? `${requiredScope.slice(0, separatorIndex)}:*`
        : requiredScope;
    return (
      grantedScopes.includes(requiredScope) || grantedScopes.includes(wildcard)
    );
  }
}
