import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Put,
  Delete as _Delete,
} from '@nestjs/common';
import { ClinicalService } from '@/domains/clinical/application/services/clinical.service';
import { LabTest } from '@/domains/clinical/core/entities/lab-test.entity';
import { LabOrder } from '@/domains/clinical/core/entities/lab-order.entity';
import { LabTestOrderStatus } from '@workspace/db';
import {
  CreateLabTestDto,
  CreateLabTestOrderDto,
  LabStatsQueryDto,
  ListLabTestOrdersQueryDto,
  UpdateLabTestOrderDto,
} from '@/domains/clinical/application/dto/lab-tests.dto';

@Controller('clinical/lab-tests')
export class LabTestsController {
  constructor(private readonly clinicalService: ClinicalService) {}

  @Get()
  async getAllTests(@Query('clinicId') clinicId: string): Promise<LabTest[]> {
    return await this.clinicalService.getAllTests(clinicId);
  }

  @Get(':id')
  async getTestById(@Param('id') id: string): Promise<LabTest> {
    return await this.clinicalService.getTestById(id);
  }

  @Post()
  async createTest(@Body() data: CreateLabTestDto): Promise<LabTest> {
    return await this.clinicalService.createTest({ ...data });
  }

  @Get('orders')
  async getAllOrders(
    @Query() query: ListLabTestOrdersQueryDto,
  ): Promise<LabOrder[]> {
    const { clinicId, ...params } = query;
    return await this.clinicalService.getAllOrders(clinicId || '', params);
  }

  @Get('orders/:id')
  async getOrderById(@Param('id') id: string): Promise<LabOrder> {
    return await this.clinicalService.getOrderById(id);
  }

  @Post('orders')
  async createOrder(@Body() data: CreateLabTestOrderDto): Promise<LabOrder> {
    return await this.clinicalService.createOrder({ ...data });
  }

  @Put('orders/:id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() body: UpdateLabTestOrderDto,
  ): Promise<LabOrder> {
    const status = (body.status || 'ORDERED') as LabTestOrderStatus;
    return await this.clinicalService.updateOrderStatus(id, status);
  }

  @Get('stats')
  async getStats(
    @Query() query: LabStatsQueryDto,
  ): Promise<Record<string, number>> {
    const { clinicId } = query;
    return await this.clinicalService.getStats(clinicId || '');
  }
}
