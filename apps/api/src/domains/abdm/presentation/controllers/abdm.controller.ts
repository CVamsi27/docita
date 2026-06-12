// jscpd:ignore-start
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ZodSerializerDto, ZodValidationPipe } from 'nestjs-zod';
import {
  APP_ACCESS_TARGETS,
  abdmGatewayCallbackSchema,
  createAbdmCareContextRequestSchema,
  createAbdmConsentRequestSchema,
} from '@workspace/types';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  Feature,
  RequireFeature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { getDbRolesForTarget } from '@/shared/modules/auth/auth/access-matrix.util';
import { getClinicStaffRequestContext } from '@/shared/modules/auth/auth/clinic-request-context';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { AbdmQueryService } from '@/domains/abdm/application/services/abdm-query.service';
import { AbdmCommandService } from '@/domains/abdm/application/services/abdm-command.service';
import { AbdmCallbackCommandService } from '@/domains/abdm/application/services/abdm-callback-command.service';
import {
  AbdmCareContextListResponseDto,
  AbdmCareContextResponseDto,
  AbdmExternalRecordListResponseDto,
  AbdmGatewayCallbackDto,
  AbdmOpsInboxResponseDto,
  CreateAbdmCareContextDto,
  CreateAbdmConsentRequestDto,
  AbdmConsentRequestResponseDto,
} from '@/domains/abdm/application/dto/abdm.dto';
// jscpd:ignore-end

@Controller('abdm')
@UseGuards(TierGuard)
@RequireFeature(Feature.ABDM_INTEGRATION)
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PATIENTS_READ))
export class AbdmController {
  constructor(
    private readonly queries: AbdmQueryService,
    private readonly commands: AbdmCommandService,
  ) {}

  @Get('care-contexts')
  @ZodSerializerDto(AbdmCareContextListResponseDto)
  listCareContexts(
    @Request() req: RequestWithUser,
    @Query('patientId') patientId?: string,
  ) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.queries.listCareContexts(
      clinicId,
      patientId?.trim() || undefined,
    );
  }

  @Post('care-contexts')
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PATIENTS_WRITE, 'write'))
  @UsePipes(new ZodValidationPipe(createAbdmCareContextRequestSchema))
  @ZodSerializerDto(AbdmCareContextResponseDto)
  createCareContext(
    @Request() req: RequestWithUser,
    @Body() dto: CreateAbdmCareContextDto,
  ) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.commands.createCareContext(clinicId, dto);
  }

  @Post('care-contexts/:id/link-request')
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PATIENTS_WRITE, 'write'))
  @ZodSerializerDto(AbdmCareContextResponseDto)
  requestCareContextLink(
    @Request() req: RequestWithUser,
    @Param('id') careContextId: string,
  ) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.commands.requestCareContextLink(clinicId, careContextId);
  }

  @Post('care-contexts/:id/share-request')
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PATIENTS_WRITE, 'write'))
  @ZodSerializerDto(AbdmCareContextResponseDto)
  requestCareContextShare(
    @Request() req: RequestWithUser,
    @Param('id') careContextId: string,
  ) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.commands.requestCareContextShare(clinicId, careContextId);
  }

  @Post('consent-requests')
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PATIENTS_WRITE, 'write'))
  @UsePipes(new ZodValidationPipe(createAbdmConsentRequestSchema))
  @ZodSerializerDto(AbdmConsentRequestResponseDto)
  createConsentRequest(
    @Request() req: RequestWithUser,
    @Body() dto: CreateAbdmConsentRequestDto,
  ) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.commands.createConsentRequest(clinicId, dto);
  }

  @Get('ops-inbox')
  @ZodSerializerDto(AbdmOpsInboxResponseDto)
  getOpsInbox(@Request() req: RequestWithUser) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.queries.getOpsInbox(clinicId);
  }

  @Get('external-records')
  @ZodSerializerDto(AbdmExternalRecordListResponseDto)
  listExternalRecords(
    @Request() req: RequestWithUser,
    @Query('patientId') patientId?: string,
  ) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.queries.listExternalRecords(
      clinicId,
      patientId?.trim() || undefined,
    );
  }
}

@Controller('abdm/callbacks')
export class AbdmGatewayCallbackController {
  constructor(private readonly callbacks: AbdmCallbackCommandService) {}

  @Public()
  @Post(':clinicId/:type')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(abdmGatewayCallbackSchema))
  async recordCallback(
    @Request() req: RequestWithUser & { rawBody?: Buffer },
    @Param('clinicId') clinicId: string,
    @Param('type') type: string,
    @Headers('x-docita-abdm-secret') sharedSecretHeader: string | undefined,
    @Headers('x-abdm-timestamp') timestamp: string | undefined,
    @Body() dto: AbdmGatewayCallbackDto,
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(dto));
    return this.callbacks.recordCallback({
      clinicId,
      type,
      rawBody,
      sharedSecretHeader,
      timestamp,
      callback: dto,
    });
  }
}
