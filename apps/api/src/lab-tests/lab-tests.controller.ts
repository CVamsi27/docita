import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { LabTestsService } from './lab-tests.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequireFeature, Feature } from '../auth/tier.decorator';

import {
  CreateLabTestDto,
  CreateLabTestOrderDto,
  UpdateLabTestOrderDto,
} from './dto/lab-tests.dto';

interface AuthRequest {
  user: {
    id: string;
    clinicId: string;
  };
}

@Controller('lab-tests')
@UseGuards(JwtAuthGuard, TierGuard)
@RequireFeature(Feature.LAB_TESTS)
export class LabTestsController {
  constructor(private readonly labTestsService: LabTestsService) {}

  // Lab Test Catalog
  @Get('catalog')
  findAllTests(@Request() req: AuthRequest) {
    return this.labTestsService.findAllTests(req.user.clinicId);
  }

  @Post('catalog')
  createTest(@Request() req: AuthRequest, @Body() dto: CreateLabTestDto) {
    return this.labTestsService.createTest(req.user.clinicId, dto);
  }

  // Lab Test Orders
  @Get('orders')
  findAllOrders(
    @Request() req: AuthRequest,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('date') date?: string,
  ) {
    return this.labTestsService.findAllOrdersWithPatients(req.user.clinicId, {
      search,
      status,
      date,
    });
  }

  @Get('orders/stats')
  getStats(@Request() req: AuthRequest) {
    return this.labTestsService.getStats(req.user.clinicId);
  }

  @Get('orders/:id')
  findOrder(@Param('id') id: string) {
    return this.labTestsService.findOrder(id);
  }

  @Post('orders')
  createOrder(@Request() req: AuthRequest, @Body() dto: CreateLabTestOrderDto) {
    return this.labTestsService.createOrder(
      req.user.clinicId,
      req.user.id,
      dto,
    );
  }

  @Patch('orders/:id')
  updateOrder(@Param('id') id: string, @Body() dto: UpdateLabTestOrderDto) {
    return this.labTestsService.updateOrder(id, dto);
  }
}
