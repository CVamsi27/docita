import { Injectable, Inject } from '@nestjs/common';
import {
  ENTERPRISE_CONTRACT_PERSISTENCE_PORT,
  type EnterpriseContractPersistencePort,
} from '@/domains/enterprise-contracts/application/ports/enterprise-contract-persistence.port';
import { EnterpriseContractStatus } from '@workspace/db';
import { type UpsertEnterpriseContractRequest } from '@workspace/types';
import { EmailService } from '@/shared/modules/messaging/email/email.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { EnterpriseContractsQueryService } from './enterprise-contracts-query.service';
import { EnterpriseContractsCommandService } from './enterprise-contracts-command.service';
import { EnterpriseContractInvoiceCommandService } from './enterprise-contract-invoice-command.service';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';

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
    @Inject(CLOCK_PORT) clock: IClock,
  ) {
    this.queryService = new EnterpriseContractsQueryService(prisma, clock);
    const invoiceService = new EnterpriseContractInvoiceCommandService(
      prisma,
      emailService,
      configService,
      clock,
    );
    this.commandService = new EnterpriseContractsCommandService(
      this.queryService,
      prisma,
      invoiceService,
      clock,
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
