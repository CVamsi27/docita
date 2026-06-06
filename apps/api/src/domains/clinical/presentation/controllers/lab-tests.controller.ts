import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Put,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Delete as _Delete,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { basename } from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  LAB_RESULT_ALLOWED_MIMES,
  LAB_RESULT_MAX_FILE_SIZE,
} from '@/domains/clinical/core/constants/upload.constants';
import { assertAllowedFileSignature } from '@/shared/common/utils/upload.utils';
import { ClinicalService } from '@/domains/clinical/application/services/clinical.service';
import { LabWorkflowCommandService } from '@/domains/clinical/application/services/lab-workflow-command.service';
import { LabWorkflowQueryService } from '@/domains/clinical/application/services/lab-workflow-query.service';
import { LabTest } from '@/domains/clinical/core/entities/lab-test.entity';
import { LabOrder } from '@/domains/clinical/core/entities/lab-order.entity';
import { LabTestOrderStatus, Role } from '@workspace/db';
import { parseStringEnumMember } from '@workspace/utils';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { FrontDeskClinicalBlockGuard } from '@/shared/modules/clinic-workspace/front-desk-clinical-block.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import {
  CreateLabDto,
  CreateLabTestDto,
  CreateLabTestOrderDto,
  LabStatsQueryDto,
  ListLabQueueQueryDto,
  ListLabTestOrdersQueryDto,
  RecordSampleCollectionDto,
  UpdateLabDto,
  UpdateLabTestOrderDto,
  UploadLabResultDto,
  VerifyLabOrderPaymentDto,
} from '@/domains/clinical/application/dto/lab-tests.dto';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
import { APP_ACCESS_TARGETS } from '@workspace/types';
import {
  getDbRolesForTarget,
  requireFeatureForTarget,
} from '@/shared/modules/auth/auth/access-matrix.util';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { getClinicStaffRequestContext } from '@/shared/modules/auth/auth/clinic-request-context';
import type {
  LabQueueItem,
  LabRecord,
  LabStats,
} from '@/domains/clinical/core/repositories/clinical.repository.interface';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import {
  logClinicPhiListRead,
  logPatientPhiRead,
} from '@/shared/modules/audit/audit/patient-access-audit.util';

@Controller('clinical/lab-tests')
@UseGuards(TierGuard, FrontDeskClinicalBlockGuard)
@RequireFeature(requireFeatureForTarget(APP_ACCESS_TARGETS.API_LAB_TESTS))
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_LAB_TESTS))
export class LabTestsController {
  constructor(
    private readonly clinicalService: ClinicalService,
    private readonly labWorkflowCommandService: LabWorkflowCommandService,
    private readonly labWorkflowQueryService: LabWorkflowQueryService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async getAllTests(@Request() req: RequestWithUser): Promise<LabTest[]> {
    return await this.clinicalService.getAllTests(
      getClinicStaffRequestContext(req).clinicId,
    );
  }

  @Get('stats')
  async getStats(
    @Request() req: RequestWithUser,
    @Query() _query: LabStatsQueryDto,
  ): Promise<LabStats> {
    return await this.clinicalService.getStats(
      getClinicStaffRequestContext(req).clinicId,
    );
  }

  @Get('orders')
  async getAllOrders(
    @Request() req: RequestWithUser,
    @Query() query: ListLabTestOrdersQueryDto,
  ): Promise<LabOrder[]> {
    const { clinicId: _clinicId, patientId, ...params } = query;

    if (patientId) {
      await logPatientPhiRead(
        this.auditService,
        req,
        patientId,
        'VIEW_HISTORY',
      );
    } else {
      await logClinicPhiListRead(
        this.auditService,
        req,
        'VIEW_LAB_ORDER_LIST',
        'LabOrder',
        params,
      );
    }

    return await this.clinicalService.getAllOrders(
      getClinicStaffRequestContext(req).clinicId,
      {
        ...params,
        patientId,
      },
    );
  }

  @Get('orders/:id')
  async getOrderById(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<LabOrder> {
    const order = await this.clinicalService.getOrderById(id);
    if (order.clinicId !== getClinicStaffRequestContext(req).clinicId) {
      throw new NotFoundException('Lab order not found');
    }
    await logPatientPhiRead(
      this.auditService,
      req,
      order.patientId,
      'VIEW_HISTORY',
    );
    return order;
  }

  @Post('orders')
  async createOrder(
    @Request() req: RequestWithUser,
    @Body() data: CreateLabTestOrderDto,
  ): Promise<LabOrder> {
    const { clinicId, userId } = getClinicStaffRequestContext(req);
    return await this.clinicalService.createOrder({
      ...data,
      clinicId,
      orderedBy: userId,
    });
  }

  @Put('orders/:id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() body: UpdateLabTestOrderDto,
  ): Promise<LabOrder> {
    const order = await this.clinicalService.getOrderById(id);
    if (order.clinicId !== getClinicStaffRequestContext(req).clinicId) {
      throw new NotFoundException('Lab order not found');
    }
    const status =
      parseStringEnumMember(
        Object.values(LabTestOrderStatus),
        body.status ?? LabTestOrderStatus.ORDERED,
      ) ?? LabTestOrderStatus.ORDERED;
    return await this.clinicalService.updateOrderStatus(id, status);
  }

  // --- Lab workspace (LAB role + clinical staff) ---

  @Get('queue')
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_LAB_WORKSPACE))
  async getLabQueue(
    @Request() req: RequestWithUser,
    @Query() query: ListLabQueueQueryDto,
  ): Promise<LabQueueItem[]> {
    const { clinicId, role } = getClinicStaffRequestContext(req);
    // LAB users only ever see their own lab's queue; clinical staff may filter.
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

  // --- Lab directory (internal/external) ---

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

  @Get(':id')
  async getTestById(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<LabTest> {
    const test = await this.clinicalService.getTestById(id);
    if (test.clinicId !== getClinicStaffRequestContext(req).clinicId) {
      throw new NotFoundException('Lab test not found');
    }
    return test;
  }

  @Post()
  async createTest(
    @Request() req: RequestWithUser,
    @Body() data: CreateLabTestDto,
  ): Promise<LabTest> {
    return await this.clinicalService.createTest({
      ...data,
      clinicId: getClinicStaffRequestContext(req).clinicId,
    });
  }
}
