import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
import { InventoryService } from '../../application/services/inventory.service';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { APP_ACCESS_TARGETS } from '@workspace/types';
import {
  getDbRolesForTarget,
  requireFeatureForTarget,
} from '@/shared/modules/auth/auth/access-matrix.util';
import {
  CreateInventoryItemDto,
  InventoryMovementDto,
  UpdateInventoryItemDto,
} from '../../application/dto/inventory.dto';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(TierGuard)
@RequireFeature(requireFeatureForTarget(APP_ACCESS_TARGETS.API_INVENTORY))
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_INVENTORY))
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get inventory statistics' })
  getStats(@Request() req: RequestWithUser) {
    return this.inventoryService.getStats(req.user!.clinicId!);
  }

  @Get()
  @ApiOperation({ summary: 'List inventory items' })
  getItems(
    @Request() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.inventoryService.getItems(req.user!.clinicId!, {
      search,
      category,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory item by ID' })
  getItemById(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.inventoryService.getItemById(req.user!.clinicId!, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create inventory item' })
  createItem(
    @Request() req: RequestWithUser,
    @Body() body: CreateInventoryItemDto,
  ) {
    return this.inventoryService.createItem(
      req.user!.clinicId!,
      req.user!.id,
      body,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update inventory item' })
  updateItem(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: UpdateInventoryItemDto,
  ) {
    return this.inventoryService.updateItem(req.user!.clinicId!, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate inventory item' })
  deleteItem(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.inventoryService.deleteItem(req.user!.clinicId!, id);
  }

  @Post(':id/movements')
  @ApiOperation({ summary: 'Record inventory movement' })
  addMovement(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: InventoryMovementDto,
  ) {
    return this.inventoryService.addMovement(
      req.user!.clinicId!,
      id,
      req.user!.id,
      body,
    );
  }
}
