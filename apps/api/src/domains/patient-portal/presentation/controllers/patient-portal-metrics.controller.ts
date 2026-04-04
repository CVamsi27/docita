import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Request,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@workspace/db';
import { JwtAuthGuard } from '@/shared/modules/auth/auth/jwt-auth.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { SkipSubscriptionCheck } from '@/shared/modules/auth/decorators';
import { RequestWithUser } from '@/common/types/common.types';
import { PatientPortalContextService } from '@/domains/patient-portal/application/services/patient-portal-context.service';
import { PatientPortalMetricsService } from '@/domains/patient-portal/application/services/patient-portal-metrics.service';
import {
  CreateMetricDefinitionDto,
  CreatePatientMetricValueDto,
  MetricHistoryQueryDto,
  UpsertMetricSelectionsDto,
} from '@/domains/patients/application/dto/patient-metrics.dto';

@ApiTags('patient-portal-metrics')
@Controller('patient-portal/metrics')
@UseGuards(JwtAuthGuard)
@Roles(Role.PATIENT)
@SkipSubscriptionCheck()
@ApiBearerAuth('JWT-auth')
export class PatientPortalMetricsController {
  constructor(
    private readonly portalMetricsService: PatientPortalMetricsService,
    private readonly contextService: PatientPortalContextService,
  ) {}

  private async resolveContext(req: RequestWithUser) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User context required');
    }
    return this.contextService.getPatientContext(userId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List metric categories for patient' })
  async getCategories(@Request() req: RequestWithUser) {
    const { patientId, clinicId } = await this.resolveContext(req);
    return this.portalMetricsService.listCategories(clinicId, patientId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get patient metric history' })
  async getHistory(
    @Request() req: RequestWithUser,
    @Query() query: MetricHistoryQueryDto,
  ) {
    const { patientId, clinicId } = await this.resolveContext(req);
    return this.portalMetricsService.getHistory(clinicId, patientId, query);
  }

  @Get('selected')
  @ApiOperation({ summary: 'Get selected metrics for patient' })
  async getSelected(@Request() req: RequestWithUser) {
    const { patientId, clinicId } = await this.resolveContext(req);
    return this.portalMetricsService.getSelections(clinicId, patientId);
  }

  @Put('selected')
  @ApiOperation({ summary: 'Update selected metrics for patient' })
  async updateSelected(
    @Request() req: RequestWithUser,
    @Body() dto: UpsertMetricSelectionsDto,
  ) {
    const { patientId, clinicId } = await this.resolveContext(req);
    return this.portalMetricsService.upsertSelections(clinicId, patientId, dto);
  }

  @Post('values')
  @ApiOperation({ summary: 'Record a metric value for patient' })
  async recordValue(
    @Request() req: RequestWithUser,
    @Body() dto: CreatePatientMetricValueDto,
  ) {
    const { patientId, clinicId } = await this.resolveContext(req);
    const userId = req.user?.id;
    return this.portalMetricsService.recordMetricValue(
      clinicId,
      patientId,
      userId,
      dto,
    );
  }

  @Post('definitions')
  @ApiOperation({ summary: 'Create a custom metric definition for patient' })
  async createDefinition(
    @Request() req: RequestWithUser,
    @Body() dto: CreateMetricDefinitionDto,
  ) {
    const { patientId, clinicId } = await this.resolveContext(req);
    return this.portalMetricsService.createDefinition(clinicId, patientId, dto);
  }

  @Get('vitals-history')
  @ApiOperation({ summary: 'Get vitals history for patient' })
  async getVitalsHistory(
    @Request() req: RequestWithUser,
    @Query() query: MetricHistoryQueryDto,
  ) {
    const { patientId, clinicId } = await this.resolveContext(req);
    return this.portalMetricsService.getHistory(clinicId, patientId, query);
  }
}
