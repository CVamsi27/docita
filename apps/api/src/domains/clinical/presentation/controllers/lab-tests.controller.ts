import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Put,
  Request,
  UseGuards,
  Delete as _Delete,
} from '@nestjs/common';
import { ClinicalService } from '@/domains/clinical/application/services/clinical.service';
import { LabTest } from '@/domains/clinical/core/entities/lab-test.entity';
import { LabOrder } from '@/domains/clinical/core/entities/lab-order.entity';
import { LabTestOrderStatus } from '@workspace/db';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import {
  CreateLabTestDto,
  CreateLabTestOrderDto,
  LabStatsQueryDto,
  ListLabTestOrdersQueryDto,
  UpdateLabTestOrderDto,
} from '@/domains/clinical/application/dto/lab-tests.dto';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
import { APP_ACCESS_TARGETS } from '@workspace/types';
import {
  getDbRolesForTarget,
  requireFeatureForTarget,
} from '@/shared/modules/auth/auth/access-matrix.util';
import { RequestWithUser } from '@/common/types/common.types';

@Controller('clinical/lab-tests')
@UseGuards(TierGuard)
@RequireFeature(requireFeatureForTarget(APP_ACCESS_TARGETS.API_LAB_TESTS))
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_LAB_TESTS))
export class LabTestsController {
  constructor(private readonly clinicalService: ClinicalService) {}

  @Get()
  async getAllTests(@Request() req: RequestWithUser): Promise<LabTest[]> {
    return await this.clinicalService.getAllTests(req.user!.clinicId!);
  }

  @Get('stats')
  async getStats(
    @Request() req: RequestWithUser,
    @Query() _query: LabStatsQueryDto,
  ): Promise<Record<string, number>> {
    return await this.clinicalService.getStats(req.user!.clinicId!);
  }

  @Get('orders')
  async getAllOrders(
    @Request() req: RequestWithUser,
    @Query() query: ListLabTestOrdersQueryDto,
  ): Promise<LabOrder[]> {
    const { clinicId: _clinicId, ...params } = query;
    return await this.clinicalService.getAllOrders(req.user!.clinicId!, params);
  }

  @Get('orders/:id')
  async getOrderById(@Param('id') id: string): Promise<LabOrder> {
    return await this.clinicalService.getOrderById(id);
  }

  @Post('orders')
  async createOrder(
    @Request() req: RequestWithUser,
    @Body() data: CreateLabTestOrderDto,
  ): Promise<LabOrder> {
    return await this.clinicalService.createOrder({
      ...data,
      clinicId: req.user!.clinicId!,
    });
  }

  @Put('orders/:id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() body: UpdateLabTestOrderDto,
  ): Promise<LabOrder> {
    const status = (body.status || 'ORDERED') as LabTestOrderStatus;
    return await this.clinicalService.updateOrderStatus(id, status);
  }

  @Get(':id')
  async getTestById(@Param('id') id: string): Promise<LabTest> {
    return await this.clinicalService.getTestById(id);
  }

  @Post()
  async createTest(
    @Request() req: RequestWithUser,
    @Body() data: CreateLabTestDto,
  ): Promise<LabTest> {
    return await this.clinicalService.createTest({
      ...data,
      clinicId: req.user!.clinicId!,
    });
  }
}
