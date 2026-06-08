import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { basename } from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  LAB_RESULT_ALLOWED_MIMES,
  LAB_RESULT_MAX_FILE_SIZE,
} from '@/domains/clinical/core/constants/upload.constants';
import { assertAllowedFileSignature } from '@/shared/common/utils/upload.utils';
import { LabWorkflowCommandService } from '@/domains/clinical/application/services/lab-workflow-command.service';
import { LabWorkflowQueryService } from '@/domains/clinical/application/services/lab-workflow-query.service';
import { Role } from '@workspace/db';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { FrontDeskClinicalBlockGuard } from '@/shared/modules/clinic-workspace/front-desk-clinical-block.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import {
  CreateLabDto,
  ListLabQueueQueryDto,
  RecordSampleCollectionDto,
  UpdateLabDto,
  UploadLabResultDto,
  VerifyLabOrderPaymentDto,
} from '@/domains/clinical/application/dto/lab-tests.dto';
import {
  APP_ACCESS_TARGETS,
} from '@workspace/types';
import type { LabQueueItem } from '@/domains/clinical/core/repositories/lab-workflow.repository.interface';
import type { LabRecord } from '@/domains/clinical/core/repositories/lab-directory.repository.interface';
import {
  requireFeatureForTarget,
  getDbRolesForTarget,
} from '@/shared/modules/auth/auth/access-matrix.util';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
import { getClinicStaffRequestContext } from '@/shared/modules/auth/auth/clinic-request-context';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { logClinicPhiListRead } from '@/shared/modules/audit/audit/patient-access-audit.util';

@Controller('clinical/lab-tests')
@UseGuards(TierGuard, FrontDeskClinicalBlockGuard)
@RequireFeature(requireFeatureForTarget(APP_ACCESS_TARGETS.API_LAB_TESTS))
export class LabWorkflowController {
  constructor(
    private readonly labWorkflowCommandService: LabWorkflowCommandService,
    private readonly labWorkflowQueryService: LabWorkflowQueryService,
    private readonly auditService: AuditService,
  ) {}

  @Get('queue')
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_LAB_WORKSPACE))
  async getLabQueue(
    @Request() req: RequestWithUser,
    @Query() query: ListLabQueueQueryDto,
  ): Promise<LabQueueItem[]> {
    const { clinicId, role } = getClinicStaffRequestContext(req);
    const labId =
      role === Role.LAB
        ? (req.user?.labId ?? undefined)
        : (query.labId ?? undefined);
    await logClinicPhiListRead(
      this.auditService,
      req,
      'VIEW_LAB_QUEUE',
      'LabOrder',
      { labId, status: query.status },
    );
    return await this.labWorkflowQueryService.listQueue(clinicId, {
      labId,
      status: query.status,
      search: query.search,
    });
  }

  @Put('orders/:id/sample')
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_LAB_WORKSPACE))
  async recordSampleCollection(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() body: RecordSampleCollectionDto,
  ): Promise<{ success: true }> {
    const { clinicId } = getClinicStaffRequestContext(req);
    await this.labWorkflowCommandService.recordSampleCollection(
      id,
      clinicId,
      body.notes,
    );
    return { success: true };
  }

  @Post('orders/:id/result')
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_LAB_WORKSPACE))
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: LAB_RESULT_MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!LAB_RESULT_ALLOWED_MIMES.includes(file.mimetype)) {
          return cb(
            new UnsupportedMediaTypeException(
              'Only images (JPEG, PNG, WebP) and PDFs are allowed',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadResult(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadLabResultDto,
  ): Promise<{ success: true }> {
    const { clinicId, userId } = getClinicStaffRequestContext(req);
    const safeName = basename(file.originalname);
    if (safeName !== file.originalname)
      throw new BadRequestException('Invalid filename');
    await assertAllowedFileSignature(file, ['pdf', 'png', 'jpeg', 'webp']);
    await this.labWorkflowCommandService.uploadResult(id, clinicId, file, {
      notes: body.notes,
      uploadedBy: userId,
    });
    return { success: true };
  }

  @Post('orders/:id/payment')
  @Roles(
    ...getDbRolesForTarget(APP_ACCESS_TARGETS.API_LAB_PAYMENT_VERIFICATION),
  )
  async verifyPayment(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() body: VerifyLabOrderPaymentDto,
  ): Promise<{ success: true }> {
    const { clinicId, userId } = getClinicStaffRequestContext(req);
    await this.labWorkflowCommandService.verifyPayment(id, clinicId, {
      method: body.paymentMethod,
      reference: body.reference,
      verifiedBy: userId,
    });
    return { success: true };
  }

  @Post('orders/:id/release')
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_LAB_WORKSPACE))
  async releaseResult(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<{ success: true }> {
    const { clinicId } = getClinicStaffRequestContext(req);
    await this.labWorkflowCommandService.releaseResult(id, clinicId);
    return { success: true };
  }

  @Get('labs')
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_LABS))
  async getLabs(@Request() req: RequestWithUser): Promise<LabRecord[]> {
    return await this.labWorkflowQueryService.listLabs(
      getClinicStaffRequestContext(req).clinicId,
    );
  }

  @Post('labs')
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_LABS, 'write'))
  async createLab(
    @Request() req: RequestWithUser,
    @Body() body: CreateLabDto,
  ): Promise<LabRecord> {
    return await this.labWorkflowCommandService.createLab(
      getClinicStaffRequestContext(req).clinicId,
      body,
    );
  }

  @Put('labs/:id')
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_LABS, 'write'))
  async updateLab(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() body: UpdateLabDto,
  ): Promise<LabRecord> {
    return await this.labWorkflowCommandService.updateLab(
      id,
      getClinicStaffRequestContext(req).clinicId,
      body,
    );
  }
}
