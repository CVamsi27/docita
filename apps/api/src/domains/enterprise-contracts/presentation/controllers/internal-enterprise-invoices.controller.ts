import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { EnterpriseContractsService } from '@/domains/enterprise-contracts/application/services/enterprise-contracts.service';
import { EnterpriseAdjustmentInvoiceDto } from '@/domains/enterprise-contracts/application/dto/enterprise-contract.dto';
import { serializeContractInvoice } from '@/domains/enterprise-contracts/presentation/helpers/contract-invoice-serializer';

@Controller('internal/enterprise-contracts')
@ApiTags('Internal - Enterprise Contracts')
@Roles(Role.INTERNAL)
@ApiBearerAuth()
export class InternalEnterpriseInvoicesController {
  constructor(private readonly contractsService: EnterpriseContractsService) {}

  @Get(':contractId/invoices')
  @ApiOperation({ summary: 'List enterprise invoices (prepay / true-up)' })
  async listInvoices(@Param('contractId') contractId: string) {
    const invoices = await this.contractsService.listInvoices(contractId);
    return invoices.map((i) => serializeContractInvoice(i));
  }

  @Get(':contractId/true-up-alerts')
  @ApiOperation({ summary: 'List true-up alerts emitted for this contract' })
  async listTrueUpAlerts(@Param('contractId') contractId: string) {
    const alerts = await this.contractsService.listTrueUpAlerts(contractId);
    return alerts.map((a) => ({
      ...a,
      alertedAt: a.alertedAt.toISOString(),
      deliveredAt: a.deliveredAt ? a.deliveredAt.toISOString() : null,
    }));
  }

  @Post(':contractId/annual-prepay-invoice')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate (or fetch existing) annual prepay invoice',
  })
  async generatePrepay(@Param('contractId') contractId: string) {
    const invoice =
      await this.contractsService.generateAnnualPrepayInvoice(contractId);
    return serializeContractInvoice(invoice);
  }

  @Post(':contractId/setup-fee-invoice')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate (or fetch existing) setup fee invoice',
  })
  async generateSetupFee(@Param('contractId') contractId: string) {
    const invoice =
      await this.contractsService.generateSetupFeeInvoice(contractId);
    return serializeContractInvoice(invoice);
  }

  @Post(':contractId/adjustment-invoice')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate a custom enterprise adjustment invoice',
  })
  async generateAdjustment(
    @Param('contractId') contractId: string,
    @Body() dto: EnterpriseAdjustmentInvoiceDto,
  ) {
    const invoice = await this.contractsService.generateAdjustmentInvoice(
      contractId,
      dto,
    );
    return serializeContractInvoice(invoice);
  }

  @Post(':contractId/evaluate-true-up')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Force a true-up evaluation (alerts via email if threshold met)',
  })
  async evaluateTrueUp(@Param('contractId') contractId: string) {
    return this.contractsService.evaluateAndAlertTrueUp(contractId);
  }

  @Get(':contractId/estimate')
  @ApiOperation({ summary: 'Estimate current period invoice' })
  async estimate(@Param('contractId') contractId: string) {
    const estimate =
      await this.contractsService.estimateCurrentPeriod(contractId);
    if (!estimate) throw new NotFoundException('No active contract');
    return estimate;
  }

  @Post(':contractId/invoice-preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview current period enterprise invoice' })
  async previewInvoice(@Param('contractId') contractId: string) {
    const preview =
      await this.contractsService.previewCurrentPeriodInvoice(contractId);
    if (!preview) throw new NotFoundException('No active contract');
    return preview;
  }
}
