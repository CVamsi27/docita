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
import { InventoryService } from './inventory.service';
import { RequestWithUser } from '@/common/types/common.types';
import { APP_ACCESS_TARGETS } from '@workspace/types';
import {
  getDbRolesForTarget,
  requireFeatureForTarget,
} from '@/shared/modules/auth/auth/access-matrix.util';
import {
  requireClinicId,
  requireUserId,
} from '@/common/utils/request-context.utils';

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
    return this.inventoryService.getStats(requireClinicId(req));
  }

  @Get()
  @ApiOperation({ summary: 'List inventory items' })
  getItems(
    @Request() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.inventoryService.getItems(requireClinicId(req), {
      search,
      category,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory item by ID' })
  getItemById(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.inventoryService.getItemById(requireClinicId(req), id);
  }

  @Post()
  @ApiOperation({ summary: 'Create inventory item' })
  createItem(
    @Request() req: RequestWithUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.inventoryService.createItem(
      requireClinicId(req),
      requireUserId(req),
      body as Parameters<InventoryService['createItem']>[2],
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update inventory item' })
  updateItem(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.inventoryService.updateItem(requireClinicId(req), id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate inventory item' })
  deleteItem(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.inventoryService.deleteItem(requireClinicId(req), id);
  }

  @Post(':id/movements')
  @ApiOperation({ summary: 'Record inventory movement' })
  addMovement(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body()
    body: {
      type: string;
      quantity: number;
      referenceType?: string;
      referenceId?: string;
      notes?: string;
    },
  ) {
    return this.inventoryService.addMovement(
      requireClinicId(req),
      id,
      requireUserId(req),
      body,
    );
  }
}
