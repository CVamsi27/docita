import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagService } from '../../../../common/services/feature-flag.service';

/**
 * Feature Flag Decorator Key
 */
export const FEATURE_FLAG_KEY = 'featureFlag';

/**
 * Decorator to require a feature flag for a controller or method
 *
 * Usage:
 * ```typescript
 * @RequireFeatureFlag('enable_ai_features')
 * @Get('ai-suggestions')
 * getAiSuggestions() { ... }
 * ```
 */
export const RequireFeatureFlag =
  (flagKey: string) =>
  (target: object, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(FEATURE_FLAG_KEY, flagKey, descriptor.value);
    } else {
      Reflect.defineMetadata(FEATURE_FLAG_KEY, flagKey, target);
    }
    return descriptor ?? target;
  };

/**
 * Guard that checks if a feature flag is enabled
 */
@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const flagKey = this.reflector.getAllAndOverride<string>(FEATURE_FLAG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!flagKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const clinicId = request.user?.clinicId || request.query?.clinicId;

    const isEnabled = await this.featureFlagService.isEnabled(
      flagKey,
      clinicId,
    );

    if (!isEnabled) {
      throw new ForbiddenException(`Feature '${flagKey}' is not enabled`);
    }

    return true;
  }
}
