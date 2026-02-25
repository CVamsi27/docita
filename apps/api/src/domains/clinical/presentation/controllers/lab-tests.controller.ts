import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Put,
  Delete,
} from '@nestjs/common';
import { ClinicalService } from '../../application/services/clinical.service';
import { LabTest } from '../../core/entities/lab-test.entity';
import { LabOrder } from '../../core/entities/lab-order.entity';
import { LabTestOrderStatus } from '@workspace/db';

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
  async createTest(@Body() data: Record<string, unknown>): Promise<LabTest> {
    return await this.clinicalService.createTest(data);
  }

  @Get('orders')
  async getAllOrders(
    @Query('clinicId') clinicId: string,
    @Query() params: Record<string, unknown>,
  ): Promise<LabOrder[]> {
    return await this.clinicalService.getAllOrders(clinicId, params);
  }

  @Get('orders/:id')
  async getOrderById(@Param('id') id: string): Promise<LabOrder> {
    return await this.clinicalService.getOrderById(id);
  }

  @Post('orders')
  async createOrder(@Body() data: Record<string, unknown>): Promise<LabOrder> {
    return await this.clinicalService.createOrder(data);
  }

  @Put('orders/:id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: LabTestOrderStatus,
  ): Promise<LabOrder> {
    return await this.clinicalService.updateOrderStatus(id, status);
  }

  @Get('stats')
  async getStats(
    @Query('clinicId') clinicId: string,
  ): Promise<Record<string, number>> {
    return await this.clinicalService.getStats(clinicId);
  }
}
