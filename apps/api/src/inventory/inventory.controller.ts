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

interface AuthRequest {
  user: {
    id: string;
    clinicId: string;
  };
}

interface CreateInventoryItemDto {
  name: string;
  category: string;
  sku?: string;
  quantity?: number;
  minQuantity?: number;
  unit?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  expiryDate?: Date;
  batchNumber?: string;
  supplier?: string;
}

interface UpdateInventoryItemDto {
  name?: string;
  category?: string;
  sku?: string;
  quantity?: number;
  minQuantity?: number;
  unit?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  expiryDate?: Date;
  batchNumber?: string;
  supplier?: string;
  active?: boolean;
}

interface CreateMovementDto {
  type: string;
  quantity: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
}

@Controller('inventory')
@UseGuards(JwtAuthGuard, TierGuard)
@RequireFeature(Feature.INVENTORY)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll(@Request() req: AuthRequest) {
    return this.inventoryService.findAll(req.user.clinicId);
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
  create(
    @Request() req: AuthRequest,
    @Body() createDto: CreateInventoryItemDto,
  ) {
    return this.inventoryService.create(req.user.clinicId, createDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateInventoryItemDto) {
    return this.inventoryService.update(id, updateDto);
  }

  @Post(':id/movements')
  addMovement(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() createDto: CreateMovementDto,
  ) {
    return this.inventoryService.addMovement(id, req.user.id, createDto);
  }
}
