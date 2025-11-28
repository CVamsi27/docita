import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { LabTestsService } from './lab-tests.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequireFeature, Feature } from '../auth/tier.decorator';

interface AuthRequest {
  user: {
    id: string;
    clinicId: string;
  };
}

interface CreateLabTestOrderDto {
  patientId: string;
  labTestId: string;
  appointmentId?: string;
  notes?: string;
}

interface UpdateLabTestOrderDto {
  status?: string;
  result?: Record<string, unknown>;
  resultUrl?: string;
  notes?: string;
}

interface CreateLabTestDto {
  name: string;
  code?: string;
  category: string;
  price?: number;
  description?: string;
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
  createTest(@Request() req: AuthRequest, @Body() createDto: CreateLabTestDto) {
    return this.labTestsService.createTest(req.user.clinicId, createDto);
  }

  // Lab Test Orders
  @Get('orders')
  findAllOrders(@Request() req: AuthRequest) {
    return this.labTestsService.findAllOrdersWithPatients(req.user.clinicId);
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
  createOrder(
    @Request() req: AuthRequest,
    @Body() createDto: CreateLabTestOrderDto,
  ) {
    return this.labTestsService.createOrder(
      req.user.clinicId,
      req.user.id,
      createDto,
    );
  }

  @Patch('orders/:id')
  updateOrder(
    @Param('id') id: string,
    @Body() updateDto: UpdateLabTestOrderDto,
  ) {
    return this.labTestsService.updateOrder(id, updateDto);
  }
}
