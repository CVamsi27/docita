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
import { getClinicStaffRequestContext } from '@/shared/modules/auth/auth/clinic-request-context';
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
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.inventoryService.getStats(clinicId);
  }

  @Get()
  @ApiOperation({ summary: 'List inventory items' })
  getItems(
    @Request() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.inventoryService.getItems(clinicId, {
      search,
      category,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory item by ID' })
  getItemById(@Request() req: RequestWithUser, @Param('id') id: string) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.inventoryService.getItemById(clinicId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create inventory item' })
  createItem(
    @Request() req: RequestWithUser,
    @Body() body: CreateInventoryItemDto,
  ) {
    const { clinicId, userId } = getClinicStaffRequestContext(req);
    return this.inventoryService.createItem(clinicId, userId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update inventory item' })
  updateItem(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: UpdateInventoryItemDto,
  ) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.inventoryService.updateItem(clinicId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate inventory item' })
  deleteItem(@Request() req: RequestWithUser, @Param('id') id: string) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.inventoryService.deleteItem(clinicId, id);
  }

  @Post(':id/movements')
  @ApiOperation({ summary: 'Record inventory movement' })
  addMovement(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: InventoryMovementDto,
  ) {
    const { clinicId, userId } = getClinicStaffRequestContext(req);
    return this.inventoryService.addMovement(clinicId, id, userId, body);
  }
}
