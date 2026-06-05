import { SetMetadata } from '@nestjs/common';

export const API_KEY_SCOPES_METADATA = 'api-key-scopes';

export const RequireApiKeyScopes = (...scopes: string[]) =>
  SetMetadata(API_KEY_SCOPES_METADATA, scopes);
