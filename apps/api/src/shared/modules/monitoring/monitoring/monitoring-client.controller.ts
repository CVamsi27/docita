import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { Request } from 'express';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { ErrorSeverity } from '@workspace/db';
import { z } from 'zod';
import { MonitoringService } from './monitoring.service';
import { JwtAuthGuard } from '@/shared/modules/auth/auth/jwt-auth.guard';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { AllowNoClinic } from '@/shared/modules/auth/auth/allow-no-clinic.decorator';
import { SkipSubscriptionCheck } from '@/shared/modules/auth/decorators/skip-subscription-check.decorator';

const ClientErrorReportSchema = z.object({
  type: z.string().min(1),
  message: z.string().min(1),
  stack: z.string().optional(),
  path: z.string().optional(),
  method: z.string().optional(),
  statusCode: z.number().int().optional(),
  metadata: z.record(z.unknown()).optional(),
  severity: z.nativeEnum(ErrorSeverity).optional(),
});

class ClientErrorReportDto extends createZodDto(ClientErrorReportSchema) {}

class ClientErrorReportResponseDto extends createZodDto(
  z.object({ success: z.boolean() }),
) {}

@Controller('monitoring/client-errors')
@UseGuards(JwtAuthGuard)
@AllowNoClinic()
@SkipSubscriptionCheck()
export class MonitoringClientController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Post()
  @ZodSerializerDto(ClientErrorReportResponseDto)
  @UsePipes(new ZodValidationPipe(ClientErrorReportSchema))
  reportClientError(
    @Req() req: Request,
    @Body() payload: ClientErrorReportDto,
  ) {
    const user = req.user as { id?: string; clinicId?: string };

    this.monitoringService.logError({
      clinicId: user?.clinicId,
      userId: user?.id,
      type: payload.type,
      message: payload.message,
      stack: payload.stack,
      path: payload.path,
      method: payload.method ?? 'CLIENT',
      statusCode: payload.statusCode,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      metadata: {
        source: 'frontend',
        ...(payload.metadata ?? {}),
      },
      severity: payload.severity ?? ErrorSeverity.ERROR,
    });

    return { success: true };
  }
}
