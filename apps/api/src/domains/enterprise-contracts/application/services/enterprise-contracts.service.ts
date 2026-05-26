import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EnterpriseContractStatus } from '@workspace/db';
import { type UpsertEnterpriseContractRequest } from '@workspace/types';
import { EmailService } from '@/shared/modules/messaging/email/email.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { EnterpriseContractsQueryService } from './enterprise-contracts-query.service';
import { EnterpriseContractsCommandService } from './enterprise-contracts-command.service';
import { EnterpriseContractInvoiceCommandService } from './enterprise-contract-invoice-command.service';

/**
 * Facade that preserves the original public API while delegating to focused
 * query and command services.
 */
@Injectable()
export class EnterpriseContractsService {
  private readonly queryService: EnterpriseContractsQueryService;
  private readonly commandService: EnterpriseContractsCommandService;

  constructor(
    @Inject(ENTERPRISE_CONTRACT_PERSISTENCE_PORT)
    private readonly persistence: EnterpriseContractPersistencePort,
    private readonly emailService: EmailService,
    private readonly configService: AppConfigService,
  ) {
    this.queryService = new EnterpriseContractsQueryService(prisma);
    const invoiceService = new EnterpriseContractInvoiceCommandService(
      prisma,
      emailService,
      configService,
    );
    this.commandService = new EnterpriseContractsCommandService(
      this.queryService,
      prisma,
      invoiceService,
    );
  }

  list() {
    return this.queryService.list();
  }

  getForClinicId(clinicId: string) {
    return this.queryService.getForClinicId(clinicId);
  }

  getByContractId(id: string) {
    return this.queryService.getByContractId(id);
  }

  getActiveForClinicId(clinicId: string) {
    return this.queryService.getActiveForClinicId(clinicId);
  }

  listRevisions(contractId: string) {
    return this.queryService.listRevisions(contractId);
  }

  listInvoices(contractId: string) {
    return this.queryService.listInvoices(contractId);
  }

  listTrueUpAlerts(contractId: string) {
    return this.queryService.listTrueUpAlerts(contractId);
  }

  estimateCurrentPeriod(contractId: string) {
    return this.queryService.estimateCurrentPeriod(contractId);
  }

  previewCurrentPeriodInvoice(contractId: string) {
    return this.queryService.previewCurrentPeriodInvoice(contractId);
  }

  toJsonContract(
    contract: Parameters<EnterpriseContractsQueryService['toJsonContract']>[0],
  ) {
    return this.queryService.toJsonContract(contract);
  }

  upsert(
    primaryClinicId: string,
    payload: UpsertEnterpriseContractRequest,
    actorUserId?: string,
  ) {
    return this.commandService.upsert(primaryClinicId, payload, actorUserId);
  }

  setStatus(
    contractId: string,
    status: EnterpriseContractStatus,
    actorUserId?: string,
  ) {
    return this.commandService.setStatus(contractId, status, actorUserId);
  }

  addMember(contractId: string, clinicId: string, actorUserId?: string) {
    return this.commandService.addMember(contractId, clinicId, actorUserId);
  }

  removeMember(contractId: string, clinicId: string, actorUserId?: string) {
    return this.commandService.removeMember(contractId, clinicId, actorUserId);
  }

  generateAnnualPrepayInvoice(contractId: string) {
    return this.commandService.generateAnnualPrepayInvoice(contractId);
  }

  evaluateAndAlertTrueUp(contractId: string) {
    return this.commandService.evaluateAndAlertTrueUp(contractId);
  }
}
