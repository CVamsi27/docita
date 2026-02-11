import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequireFeature, Feature } from '../auth/tier.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@workspace/db';

import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  CreateMovementDto,
  InventoryListResponseDto,
  InventoryResponseDto,
  InventoryStatsResponseDto,
} from './dto/inventory.dto';
import { ZodSerializerDto } from 'nestjs-zod';

interface AuthRequest {
  user: {
    id: string;
    clinicId: string;
  };
}

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard, TierGuard)
@RequireFeature(Feature.INVENTORY)
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ZodSerializerDto(InventoryListResponseDto)
  findAll(
    @Request() req: AuthRequest,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.inventoryService.findAll(req.user.clinicId, {
      search,
      category,
      status,
    });
  }

  @Get('stats')
  @ZodSerializerDto(InventoryStatsResponseDto)
  getStats(@Request() req: AuthRequest) {
    return this.inventoryService.getStats(req.user.clinicId);
  }

  @Get('low-stock')
  @ZodSerializerDto(InventoryListResponseDto)
  getLowStockItems(@Request() req: AuthRequest) {
    return this.inventoryService.getLowStockItems(req.user.clinicId);
  }

  @Get('expiring')
  @ZodSerializerDto(InventoryListResponseDto)
  getExpiringItems(@Request() req: AuthRequest, @Query('days') days?: string) {
    return this.inventoryService.getExpiringItems(
      req.user.clinicId,
      days ? parseInt(days, 10) : 30,
    );
  }

  @Get(':id')
  @ZodSerializerDto(InventoryResponseDto)
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Post()
  @ZodSerializerDto(InventoryResponseDto)
  create(@Request() req: AuthRequest, @Body() dto: CreateInventoryItemDto) {
    return this.inventoryService.create(req.user.clinicId, dto);
  }

  @Patch(':id')
  @ZodSerializerDto(InventoryResponseDto)
  update(@Param('id') id: string, @Body() dto: UpdateInventoryItemDto) {
    return this.inventoryService.update(id, dto);
  }

  @Post(':id/movements')
  @ZodSerializerDto(InventoryResponseDto)
  addMovement(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: CreateMovementDto,
  ) {
    return this.inventoryService.addMovement(id, req.user.id, dto);
  }
}
