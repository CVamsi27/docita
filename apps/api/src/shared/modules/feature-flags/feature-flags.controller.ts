import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@workspace/db';
import {
  FeatureFlagResolvedResponse,
  FeatureFlagUpsertRequest,
  featureFlagUpsertRequestSchema,
} from '@workspace/types';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { FeatureFlagsService } from '@/shared/modules/feature-flags/feature-flags.service';
import type { RequestWithUser } from '@/shared/common/types/common.types';

@Controller('feature-flags')
@ApiTags('Feature Flags')
@ApiBearerAuth()
export class FeatureFlagsController {
  constructor(private readonly service: FeatureFlagsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Resolve feature flags for the calling user' })
  async resolveForCaller(
    @Req() req: RequestWithUser,
  ): Promise<FeatureFlagResolvedResponse> {
    const flags = await this.service.resolveAllForContext({
      clinicId: req.user?.clinicId ?? null,
      userId: req.user?.id ?? null,
    });
    return { flags };
  }

  @Get()
  @Roles(Role.INTERNAL)
  @ApiOperation({ summary: 'List every feature flag definition' })
  async list() {
    return this.service.findAll();
  }

  @Put(':key')
  @Roles(Role.INTERNAL)
  @ApiOperation({ summary: 'Upsert a feature flag definition' })
  async upsert(
    @Param('key') key: string,
    @Body(new ZodValidationPipe(featureFlagUpsertRequestSchema))
    body: FeatureFlagUpsertRequest,
  ) {
    return this.service.upsert({
      key,
      description: body.description ?? key,
      defaultEnabled: body.defaultEnabled,
      clinicOverrides: body.clinicOverrides ?? null,
      userOverrides: body.userOverrides ?? null,
      percentageRollout: body.percentageRollout ?? null,
    });
  }

  @Post(':key/kill')
  @Roles(Role.INTERNAL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Disable a flag globally and clear all overrides (kill-switch)',
  })
  async kill(@Param('key') key: string) {
    const result = await this.service.kill(key);
    if (!result) throw new NotFoundException(`Feature flag "${key}" not found`);
    return result;
  }

  @Public()
  @Get(':key/health')
  @ApiOperation({
    summary: 'Lightweight existence check used by ops dashboards',
  })
  async health(@Param('key') key: string) {
    const flags = await this.service.findAll();
    const found = flags.find((f) => f.key === key);
    return { exists: Boolean(found) };
  }
}
