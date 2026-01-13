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

import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  CreateMovementDto,
} from './dto/inventory.dto';

interface AuthRequest {
  user: {
    id: string;
    clinicId: string;
  };
}

@Controller('inventory')
@UseGuards(JwtAuthGuard, TierGuard)
@RequireFeature(Feature.INVENTORY)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) { }

  @Get()
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
  getStats(@Request() req: AuthRequest) {
    return this.inventoryService.getStats(req.user.clinicId);
  }

  @Get('low-stock')
  getLowStockItems(@Request() req: AuthRequest) {
    return this.inventoryService.getLowStockItems(req.user.clinicId);
  }

  @Get('expiring')
  getExpiringItems(@Request() req: AuthRequest, @Query('days') days?: string) {
    return this.inventoryService.getExpiringItems(
      req.user.clinicId,
      days ? parseInt(days, 10) : 30,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateInventoryItemDto) {
    return this.inventoryService.create(req.user.clinicId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInventoryItemDto) {
    return this.inventoryService.update(id, dto);
  }

  @Post(':id/movements')
  addMovement(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: CreateMovementDto,
  ) {
    return this.inventoryService.addMovement(id, req.user.id, dto);
  }
}
