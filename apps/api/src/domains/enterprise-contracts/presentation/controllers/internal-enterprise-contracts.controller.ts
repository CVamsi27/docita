import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { EnterpriseContractsService } from '@/domains/enterprise-contracts/application/services/enterprise-contracts.service';
import {
  UpsertEnterpriseContractDto,
  SetEnterpriseContractStatusDto,
  AddContractMemberDto,
  EnterpriseAdjustmentInvoiceDto,
} from '@/domains/enterprise-contracts/application/dto/enterprise-contract.dto';
import { RequestWithUser } from '@/shared/common/types/common.types';

@Controller('internal/enterprise-contracts')
@ApiTags('Internal - Enterprise Contracts')
@Roles(Role.INTERNAL)
@ApiBearerAuth()
export class InternalEnterpriseContractsController {
  constructor(private readonly contractsService: EnterpriseContractsService) {}

  @Get()
  @ApiOperation({ summary: 'List all enterprise contracts' })
  async list() {
    const contracts = await this.contractsService.list();
    return contracts.map((c) => this.contractsService.toJsonContract(c));
  }

  @Get('by-clinic/:clinicId')
  @ApiOperation({ summary: 'Resolve the contract covering a clinic' })
  async getByClinic(@Param('clinicId') clinicId: string) {
    const contract = await this.contractsService.getForClinicId(clinicId);
    if (!contract)
      throw new NotFoundException('No contract found for this clinic');
    return this.contractsService.toJsonContract(contract);
  }

  @Put('by-primary-clinic/:clinicId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Create or update a contract identified by its contractNumber (path provides primary clinic)',
  })
  async upsert(
    @Param('clinicId') clinicId: string,
    @Body() dto: UpsertEnterpriseContractDto,
    @Request() req: RequestWithUser,
  ) {
    const contract = await this.contractsService.upsert(
      clinicId,
      dto,
      req.user?.id,
    );
    return this.contractsService.toJsonContract(contract);
  }

  @Get(':contractId')
  @ApiOperation({ summary: 'Get a contract by id' })
  async get(@Param('contractId') contractId: string) {
    const contract = await this.contractsService.getByContractId(contractId);
    if (!contract) throw new NotFoundException('Contract not found');
    return this.contractsService.toJsonContract(contract);
  }

  @Post(':contractId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change contract status' })
  async setStatus(
    @Param('contractId') contractId: string,
    @Body() dto: SetEnterpriseContractStatusDto,
    @Request() req: RequestWithUser,
  ) {
    const contract = await this.contractsService.setStatus(
      contractId,
      dto.status,
      req.user?.id,
    );
    return this.contractsService.toJsonContract(contract);
  }

  @Post(':contractId/members')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a member clinic to a group contract' })
  async addMember(
    @Param('contractId') contractId: string,
    @Body() dto: AddContractMemberDto,
    @Request() req: RequestWithUser,
  ) {
    const contract = await this.contractsService.addMember(
      contractId,
      dto.clinicId,
      req.user?.id,
    );
    return this.contractsService.toJsonContract(contract);
  }

  @Delete(':contractId/members/:clinicId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member clinic from a group contract' })
  async removeMember(
    @Param('contractId') contractId: string,
    @Param('clinicId') clinicId: string,
    @Request() req: RequestWithUser,
  ) {
    const contract = await this.contractsService.removeMember(
      contractId,
      clinicId,
      req.user?.id,
    );
    return this.contractsService.toJsonContract(contract);
  }

  @Get(':contractId/revisions')
  @ApiOperation({ summary: 'List revision history' })
  async listRevisions(@Param('contractId') contractId: string) {
    const revisions = await this.contractsService.listRevisions(contractId);
    return revisions.map((r) => ({
      ...r,
      effectiveDate: r.effectiveDate.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }));
  }

  @Get(':contractId/invoices')
  @ApiOperation({ summary: 'List enterprise invoices (prepay / true-up)' })
  async listInvoices(@Param('contractId') contractId: string) {
    const invoices = await this.contractsService.listInvoices(contractId);
    return invoices.map((i) => ({
      ...i,
      periodStart: i.periodStart.toISOString(),
      periodEnd: i.periodEnd.toISOString(),
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    }));
  }

  @Get(':contractId/true-up-alerts')
  @ApiOperation({ summary: 'List true-up alerts emitted for this contract' })
  async listTrueUpAlerts(@Param('contractId') contractId: string) {
    const alerts = await this.contractsService.listTrueUpAlerts(contractId);
    return alerts.map((a) => ({
      ...a,
      alertedAt: a.alertedAt.toISOString(),
    }));
  }

  @Post(':contractId/annual-prepay-invoice')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate (or fetch existing) annual prepay invoice',
  })
  async generatePrepay(@Param('contractId') contractId: string) {
    const invoice = await this.contractsService.generateAnnualPrepayInvoice(contractId);
    return {
      ...invoice,
      periodStart: invoice.periodStart.toISOString(),
      periodEnd: invoice.periodEnd.toISOString(),
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    };
  }

  @Post(':contractId/setup-fee-invoice')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate (or fetch existing) setup fee invoice',
  })
  async generateSetupFee(@Param('contractId') contractId: string) {
    const invoice = await this.contractsService.generateSetupFeeInvoice(contractId);
    return {
      ...invoice,
      periodStart: invoice.periodStart.toISOString(),
      periodEnd: invoice.periodEnd.toISOString(),
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    };
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
    return {
      ...invoice,
      periodStart: invoice.periodStart.toISOString(),
      periodEnd: invoice.periodEnd.toISOString(),
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    };
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
    const estimate = await this.contractsService.estimateCurrentPeriod(contractId);
    if (!estimate) throw new NotFoundException('No active contract');
    return estimate;
  }

  @Post(':contractId/invoice-preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview current period enterprise invoice' })
  async previewInvoice(@Param('contractId') contractId: string) {
    const preview = await this.contractsService.previewCurrentPeriodInvoice(contractId);
    if (!preview) throw new NotFoundException('No active contract');
    return preview;
  }

  @Delete(':contractId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Terminate a contract (soft)' })
  async terminate(
    @Param('contractId') contractId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.contractsService.setStatus(
      contractId,
      'TERMINATED',
      req.user?.id,
    );
  }
}
