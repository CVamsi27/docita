import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/modules/auth/auth/jwt-auth.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { Role } from '@workspace/db';
import { SkipSubscriptionCheck } from '@/shared/modules/auth/decorators/skip-subscription-check.decorator';
import { EnterpriseContractsService } from '@/domains/enterprise-contracts/application/services/enterprise-contracts.service';
import { RequestWithUser } from '@/common/types/common.types';

@Controller('subscription/enterprise-contract')
@SkipSubscriptionCheck()
@ApiTags('Enterprise Contract')
@ApiBearerAuth()
export class ClinicEnterpriseContractController {
  constructor(private readonly contractsService: EnterpriseContractsService) {}

  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.INTERNAL)
  @Get()
  @ApiOperation({ summary: 'Get this clinic’s enterprise contract' })
  async getMine(@Request() req: RequestWithUser) {
    if (!req.user?.clinicId) return null;
    const contract = await this.contractsService.getForClinicId(
      req.user.clinicId,
    );
    return contract ? this.contractsService.toJsonContract(contract) : null;
  }

  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.INTERNAL)
  @Get('estimate')
  @ApiOperation({ summary: 'Get this month’s projected enterprise invoice' })
  async getEstimate(@Request() req: RequestWithUser) {
    if (!req.user?.clinicId) return null;
    const contract = await this.contractsService.getForClinicId(
      req.user.clinicId,
    );
    if (!contract) return null;
    return this.contractsService.estimateCurrentPeriod(contract.id);
  }
}
