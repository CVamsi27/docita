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
  UsePipes,
} from '@nestjs/common';
import { LabTestsService } from './lab-tests.service';
import { JwtAuthGuard } from '../../shared/modules/auth/auth/jwt-auth.guard';
import { TierGuard } from '../../shared/modules/auth/auth/tier.guard';
import {
  RequireFeature,
  Feature,
} from '../../shared/modules/auth/auth/tier.decorator';
import { RolesGuard } from '../../shared/modules/auth/auth/roles.guard';
import { Roles } from '../../shared/modules/auth/auth/roles.decorator';
import { Role } from '@workspace/db';

import {
  CreateLabTestDto,
  CreateLabTestOrderDto,
  UpdateLabTestOrderDto,
  LabTestListResponseDto,
  LabTestResponseDto,
  LabTestOrderListResponseDto,
  LabTestOrderResponseDto,
  CreateLabTestSchema,
  CreateLabTestOrderSchema,
  UpdateLabTestOrderSchema,
} from './dto/lab-tests.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

interface AuthRequest {
  user: {
    id: string;
    clinicId: string;
  };
}

@Controller('lab-tests')
@UseGuards(JwtAuthGuard, RolesGuard, TierGuard)
@RequireFeature(Feature.LAB_TESTS)
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class LabTestsController {
  constructor(private readonly labTestsService: LabTestsService) {}

  // Lab Test Catalog
  @Get('catalog')
  @ZodSerializerDto(LabTestListResponseDto)
  findAllTests(@Request() req: AuthRequest) {
    return this.labTestsService.findAllTests(req.user.clinicId);
  }

  @Post('catalog')
  @ZodSerializerDto(LabTestResponseDto)
  @UsePipes(new ZodValidationPipe(CreateLabTestSchema))
  createTest(@Request() req: AuthRequest, @Body() dto: CreateLabTestDto) {
    return this.labTestsService.createTest(req.user.clinicId, dto);
  }

  // Lab Test Orders
  @Get('orders')
  @ZodSerializerDto(LabTestOrderListResponseDto)
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
  @ZodSerializerDto(LabTestOrderResponseDto)
  findOrder(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.labTestsService.findOrder(id, req.user.clinicId);
  }

  @Post('orders')
  @ZodSerializerDto(LabTestOrderResponseDto)
  @UsePipes(new ZodValidationPipe(CreateLabTestOrderSchema))
  createOrder(@Request() req: AuthRequest, @Body() dto: CreateLabTestOrderDto) {
    return this.labTestsService.createOrder(
      req.user.clinicId,
      req.user.id,
      dto,
    );
  }

  @Patch('orders/:id')
  @ZodSerializerDto(LabTestOrderResponseDto)
  @UsePipes(new ZodValidationPipe(UpdateLabTestOrderSchema))
  updateOrder(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateLabTestOrderDto,
  ) {
    return this.labTestsService.updateOrder(
      id,
      dto as unknown as import('./lab-tests.service').UpdateLabTestOrderDto,
      req.user.clinicId,
    );
  }
}
