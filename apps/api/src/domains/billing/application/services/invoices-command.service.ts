import { getPatientFullName } from '@workspace/utils';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, InvoiceStatus } from '@workspace/db';
import {
  taxRegistrationSnapshotSchema,
  type InvoiceItem,
  type PlaceOfSupply,
} from '@workspace/types';
import {
  IInvoiceRepository,
  INVOICE_REPOSITORY_TOKEN,
  InvoiceDetail,
  PatientInvoiceContext,
} from '@/domains/billing/core/repositories/invoice.repository';
import { ClaimValidationService } from '@/domains/billing/core/services/claim-validation.service';
import { TaxCalculatorService } from '@/domains/billing/core/services/tax-calculator.service';
import { UsageTrackingService } from '@/domains/billing/core/services/usage-tracking.service';
import { StorageProvider } from '@/domains/documents/application/ports/storage-provider.port';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import {
  toInvoiceCentCreateFields,
  toInvoiceCentUpdateFields,
  toInvoiceLineItemCreates,
  toPrismaJson,
} from '@/domains/billing/core/utils/invoice-normalization';
import { InvoicesQueryService } from './invoices-query.service';
import {
  parseTaxSettings,
  parseTaxRegistrationSnapshot,
  extractClinicGstin,
  extractGstinStateCode,
  toPrismaInvoiceItems,
  normalizeSpecialization,
  normalizeDoctorRole,
  addDays,
  DEFAULT_INVOICE_DUE_DAYS,
  CURRENT_PDF_TEMPLATE_VERSION,
  CreateInvoiceParams,
} from './invoices-helpers';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  assertInvoiceStatusTransition,
  requiresClaimReadinessValidation,
} from './invoice-status-transition';
@Injectable()
export class InvoicesCommandService {
  private readonly logger = new Logger(InvoicesCommandService.name);

  constructor(
    @Inject(INVOICE_REPOSITORY_TOKEN)
    private readonly repository: IInvoiceRepository,
    private readonly taxCalculator: TaxCalculatorService,
    private readonly eventEmitter: EventEmitter2,
    private readonly usageTracking: UsageTrackingService,
    private readonly storageProvider: StorageProvider,
    private readonly claimValidationService: ClaimValidationService,
    private readonly queryService: InvoicesQueryService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  private buildTaxSnapshots(patient: PatientInvoiceContext) {
    const taxSettings = parseTaxSettings(patient.clinic.settings);
    const gstin =
      taxSettings.registrationId || extractClinicGstin(patient.clinic);
    const stateCode = taxSettings.stateCode || extractGstinStateCode(gstin);
    const seller = taxRegistrationSnapshotSchema.parse({
      countryCode: taxSettings.countryCode,
      regime: taxSettings.regime,
      registrationId: gstin,
      registrationLabel:
        taxSettings.registrationLabel || (gstin ? 'GSTIN' : undefined),
      legalName: taxSettings.legalName || patient.clinic.name,
      address: patient.clinic.address || undefined,
      stateCode,
      stateName: taxSettings.stateName,
    });
    const buyer = taxRegistrationSnapshotSchema.parse({
      countryCode: seller.countryCode,
      regime: seller.regime,
      legalName: getPatientFullName(patient).trim(),
      address: patient.address || undefined,
    });
    return { taxSettings, seller, buyer };
  }
  private async calculateTaxForPatientInvoice(
    patientId: string,
    clinicId: string | undefined,
    items: InvoiceItem[],
    placeOfSupply?: PlaceOfSupply,
  ) {
    const patient = await this.repository.findPatientContext(
      patientId,
      clinicId,
    );
    if (!patient) {
      throw new NotFoundException(`Patient ${patientId} not found`);
    }

    const { taxSettings, seller, buyer } = this.buildTaxSnapshots(patient);
    const calculation = this.taxCalculator.calculateInvoice({
      items,
      currency: patient.clinic.currency || undefined,
      seller,
      buyer,
      placeOfSupply,
      reverseCharge: false,
    });

    return { patient, taxSettings, seller, buyer, calculation };
  }

  async create(
    data: CreateInvoiceParams & { idempotencyKey?: string },
  ): Promise<InvoiceDetail> {
    // Idempotency short-circuit: if the caller passes a key they've used
    // before, return the prior invoice instead of creating a duplicate.
    if (data.idempotencyKey) {
      const existing = await this.repository.findByIdempotencyKey?.(
        data.idempotencyKey,
        data.clinicId,
      );
      if (existing) return existing;
    }
    const issuedAt = this.clock.now();
    const { patient, taxSettings, seller, buyer, calculation } =
      await this.calculateTaxForPatientInvoice(
        data.patientId,
        data.clinicId,
        data.items,
        data.placeOfSupplyStateCode
          ? {
              countryCode: 'IN',
              stateCode: data.placeOfSupplyStateCode,
              stateName: data.placeOfSupplyStateName,
            }
          : undefined,
      );
    const invoiceNumber = await this.repository.nextInvoiceNumber(
      patient.clinic.id,
      issuedAt,
      taxSettings.invoicePrefix,
    );
    const dueDate = addDays(issuedAt, DEFAULT_INVOICE_DUE_DAYS);

    const invoice = await this.repository.create({
      appointment: data.appointmentId
        ? { connect: { id: data.appointmentId } }
        : undefined,
      patient: { connect: { id: data.patientId } },
      clinic: { connect: { id: patient.clinic.id } },
      invoiceNumber,
      invoiceType: calculation.invoiceType,
      currency: calculation.summary.currency,
      total: calculation.grandTotal,
      subtotal: calculation.subtotal,
      discountTotal: calculation.discountTotal,
      taxTotal: calculation.taxTotal,
      grandTotal: calculation.grandTotal,
      ...toInvoiceCentCreateFields({
        total: calculation.grandTotal,
        subtotal: calculation.subtotal,
        discountTotal: calculation.discountTotal,
        taxTotal: calculation.taxTotal,
        grandTotal: calculation.grandTotal,
      }),
      taxSummary: toPrismaJson(calculation.summary),
      sellerTaxSnapshot: toPrismaJson(seller),
      buyerTaxSnapshot: toPrismaJson(buyer),
      placeOfSupplyStateCode: calculation.summary.placeOfSupply?.stateCode,
      placeOfSupplyStateName: calculation.summary.placeOfSupply?.stateName,
      reverseCharge: calculation.summary.reverseCharge,
      issuedAt,
      dueDate,
      eInvoiceRequired: calculation.summary.eInvoice?.required ?? false,
      status: data.status,
      items: toPrismaInvoiceItems(calculation.items),
      lineItems: {
        create: toInvoiceLineItemCreates(calculation.items, patient.clinic.id),
      },
      doctorName: data.doctorName,
      doctorEmail: data.doctorEmail,
      doctorPhone: data.doctorPhone,
      doctorSpecialization: normalizeSpecialization(data.doctorSpecialization),
      doctorRole: normalizeDoctorRole(data.doctorRole),
      doctorRegistrationNumber: data.doctorRegistrationNumber,
      doctorLicenseNumber: data.doctorLicenseNumber,
      idempotencyKey: data.idempotencyKey,
    });

    this.eventEmitter.emit(ApplicationEvents.INVOICE_GENERATED, {
      // allow-direct-emit: post-commit fan-out to payment-link generation + usage tracking. The invoice itself is a single atomic write above. Outbox migration deferred (ADR 0010 §Follow-up).
      invoiceId: invoice.id,
      clinicId: patient.clinic.id,
    });
    this.usageTracking
      .trackInvoice(patient.clinic.id, invoice.id)
      .catch((err: unknown) => {
        this.logger.error(
          `Failed to track invoice usage for ${invoice.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });

    return invoice;
  }

  async update(
    id: string,
    data: { status?: InvoiceStatus; total?: number; items?: InvoiceItem[] },
    clinicId: string,
  ): Promise<InvoiceDetail> {
    const existing = await this.queryService.findOne(id, clinicId);

    if (data.status) {
      assertInvoiceStatusTransition(existing.status, data.status);
    }

    if (
      data.status &&
      requiresClaimReadinessValidation(existing.status, data.status)
    ) {
      await this.claimValidationService.assertClaimReady(id, clinicId);
    }

    const updateData: Prisma.InvoiceUpdateInput = {
      status: data.status,
    };

    if (data.items) {
      let seller = parseTaxRegistrationSnapshot(existing.sellerTaxSnapshot);
      let buyer = parseTaxRegistrationSnapshot(existing.buyerTaxSnapshot);

      if (!seller || !buyer) {
        const recalculationContext = await this.calculateTaxForPatientInvoice(
          existing.patientId,
          clinicId ?? existing.clinicId ?? undefined,
          data.items,
        );
        seller = recalculationContext.seller;
        buyer = recalculationContext.buyer;
      }

      const calculation = this.taxCalculator.calculateInvoice({
        items: data.items,
        currency: existing.currency,
        seller,
        buyer,
        reverseCharge: existing.reverseCharge,
      });

      updateData.items = toPrismaInvoiceItems(calculation.items);
      updateData.invoiceType = calculation.invoiceType;
      updateData.total = calculation.grandTotal;
      updateData.subtotal = calculation.subtotal;
      updateData.discountTotal = calculation.discountTotal;
      updateData.taxTotal = calculation.taxTotal;
      updateData.grandTotal = calculation.grandTotal;
      Object.assign(
        updateData,
        toInvoiceCentUpdateFields({
          total: calculation.grandTotal,
          subtotal: calculation.subtotal,
          discountTotal: calculation.discountTotal,
          taxTotal: calculation.taxTotal,
          grandTotal: calculation.grandTotal,
        }),
      );
      updateData.taxSummary = toPrismaJson(calculation.summary);
      updateData.sellerTaxSnapshot = toPrismaJson(seller);
      updateData.buyerTaxSnapshot = toPrismaJson(buyer);
      updateData.placeOfSupplyStateCode =
        calculation.summary.placeOfSupply?.stateCode;
      updateData.placeOfSupplyStateName =
        calculation.summary.placeOfSupply?.stateName;
      updateData.reverseCharge = calculation.summary.reverseCharge;
      updateData.eInvoiceRequired =
        calculation.summary.eInvoice?.required ?? false;
      updateData.lineItems = {
        deleteMany: {},
        create: toInvoiceLineItemCreates(
          calculation.items,
          clinicId ?? existing.clinicId ?? existing.patient?.clinic?.id,
        ),
      };
    }

    return this.repository.update(id, updateData, clinicId);
  }

  async remove(id: string, clinicId: string): Promise<void> {
// jscpd:ignore-start
    await this.repository.delete(id, clinicId);
  }

  async submitClaim(
    id: string,
    clinicId: string,
  ): Promise<{
    invoiceId: string;
    claimReady: true;
    submittedAt: string;
    status: InvoiceStatus;
  }> {
    await this.claimValidationService.assertClaimReady(id, clinicId);
// jscpd:ignore-end
    const invoice = await this.queryService.findOne(id, clinicId);

    return {
      invoiceId: invoice.id,
      claimReady: true,
      submittedAt: this.clock.now().toISOString(),
      status: invoice.status,
    };
  }

  async uploadAndPersist(
    id: string,
    clinicId: string,
    buffer: Buffer,
    invoice: InvoiceDetail,
  ): Promise<{ storedKey: string; generatedAt: Date }> {
    const objectKey = `pdfs/invoices/${id}.pdf`;
    const generatedAt = this.clock.now();
    const storedKey = await this.storageProvider.uploadBuffer(
      buffer,
      objectKey,
      'application/pdf',
      {
        metadata: {
          asset_type: 'invoice-pdf',
          resource_type: 'Invoice',
          resource_id: id,
          clinic_id: invoice.patient?.clinic?.id,
          doctor_id: invoice.appointment?.doctor?.id,
          modified_at: generatedAt.toISOString(),
          modified_by: invoice.appointment?.doctor?.id || 'system',
// jscpd:ignore-start
          auth_method: 'invoice-service',
        },
      },
    );

    await this.repository.update(
      id,
      {
        pdfUrl: storedKey,
        pdfGeneratedAt: generatedAt,
        pdfTemplateVersion: CURRENT_PDF_TEMPLATE_VERSION,
      },
      clinicId,
    );

    return { storedKey, generatedAt };
  }
}
// jscpd:ignore-end
