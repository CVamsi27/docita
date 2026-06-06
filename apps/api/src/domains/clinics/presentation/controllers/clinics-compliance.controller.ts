import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Request,
  Query,
  ForbiddenException,
  BadRequestException,
  UsePipes,
} from '@nestjs/common';
import { ClinicsService } from '@/domains/clinics/application/services/clinics.service';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { Role } from '@workspace/db';
import {
  createDataSubjectRequestSchema,
  dataSubjectRequestStatusSchema,
  updateDataSubjectRequestSchema,
  type CreateDataSubjectRequest,
  type UpdateDataSubjectRequest,
} from '@workspace/types';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import { RequestWithUser } from '@/shared/common/types/common.types';
import {
  assertOwnClinic,
  getClinicRequestIpAddress,
  getClinicRequestUserId,
} from '@/domains/clinics/presentation/controllers/clinics-controller.helpers';

@Controller('clinics')
export class ClinicsComplianceController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.DOCTOR)
  @Get(':id/compliance')
  async getComplianceSummary(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    if (req.user?.clinicId !== id)
      throw new ForbiddenException(
        'You can only view compliance for your own clinic',
      );

    return this.clinicsService.getComplianceSummary(id);
  }

  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @Get(':id/data-subject-requests')
  async listDataSubjectRequests(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Query('status') status?: string,
  ) {
    assertOwnClinic(req, id);
    const parsedStatus = status
      ? dataSubjectRequestStatusSchema.safeParse(status)
      : undefined;

    if (parsedStatus && !parsedStatus.success)
      throw new BadRequestException('Invalid request status');

    return this.clinicsService.listDataSubjectRequests(id, parsedStatus?.data);
  }

  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @Post(':id/data-subject-requests')
  @UsePipes(new ZodValidationPipe(createDataSubjectRequestSchema))
  async createDataSubjectRequest(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() body: CreateDataSubjectRequest,
  ) {
    assertOwnClinic(req, id);

    return this.clinicsService.createDataSubjectRequest(
      id,
      body,
      getClinicRequestUserId(req),
      getClinicRequestIpAddress(req),
    );
  }

  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @Patch(':id/data-subject-requests/:requestId')
  @UsePipes(new ZodValidationPipe(updateDataSubjectRequestSchema))
  async updateDataSubjectRequest(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @Request() req: RequestWithUser,
    @Body() body: UpdateDataSubjectRequest,
  ) {
    assertOwnClinic(req, id);

    return this.clinicsService.updateDataSubjectRequest(
      id,
      requestId,
      body,
      getClinicRequestUserId(req),
      getClinicRequestIpAddress(req),
    );
  }
}
