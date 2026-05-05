import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Feature } from '@/shared/modules/auth/auth/tier.decorator';
import { assertClinicHasFeatureOrThrow } from '@/shared/modules/auth/utils/clinic-feature-access.util';
import {
  Prisma,
  InvoiceStatus,
  HospitalRole,
  Specialization,
  PaymentSession,
} from '@workspace/db';
import { PDFService } from './pdf.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  invoiceTaxSummarySchema,
  invoiceItemSchema,
  taxRegistrationSnapshotSchema,
  taxSettingsSchema,
  type InvoiceItem,
  type InvoiceTaxSummary,
  type EnqueuePdfJobResponse,
  type TaxRegistrationSnapshot,
  type TaxSettings,
  type InvoicePaymentActivityItem,
  type InvoicePaymentActivityResponse,
  extractPdfTheme,
} from '@workspace/types';
import {
  IInvoiceRepository,
  INVOICE_REPOSITORY_TOKEN,
  InvoiceDetail,
  PatientInvoiceContext,
} from '@/domains/billing/core/repositories/invoice.repository';
import {
  IPaymentSessionRepository,
  PAYMENT_SESSION_REPOSITORY_TOKEN,
} from '@/domains/billing/core/repositories/payment-session.repository';
import { UsageTrackingService } from '@/domains/billing/core/services/usage-tracking.service';
import { StorageProvider } from '@/domains/documents/infrastructure/storage.provider';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';
import {
  ClaimReadinessResult,
  ClaimValidationService,
} from '@/domains/billing/core/services/claim-validation.service';
import { TaxCalculatorService } from '@/domains/billing/core/services/tax-calculator.service';
import { PdfJobService } from '@/shared/modules/queue/pdf-job.service';
import type { PdfJobServicePort } from '@/shared/modules/queue/pdf-job.service';
import {
  toInvoiceCentCreateFields,
  toInvoiceCentUpdateFields,
  toInvoiceLineItemCreates,
  toPrismaJson,
} from '@/domains/billing/core/utils/invoice-normalization';

const CURRENT_PDF_TEMPLATE_VERSION = 1;
const PDF_SIGNED_URL_TTL_SECONDS = 3600;
const DEFAULT_INVOICE_DUE_DAYS = 30;

const toPrismaInvoiceItems = (items: InvoiceItem[]): Prisma.InputJsonValue => {
  const parsedItems = invoiceItemSchema.array().parse(items);
  return toPrismaJson(parsedItems);
};

const parseInvoiceItems = (items: Prisma.JsonValue): InvoiceItem[] => {
  const parsed = invoiceItemSchema.array().safeParse(items);
  return parsed.success ? parsed.data : [];
};

const normalizeSpecialization = (
  value?: string | null,
): Specialization | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return Object.values(Specialization).includes(value as Specialization)
    ? (value as Specialization)
    : undefined;
};

const normalizeDoctorRole = (
  value?: string | null,
): HospitalRole | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return Object.values(HospitalRole).includes(value as HospitalRole)
    ? (value as HospitalRole)
    : undefined;
};

const isJsonObject = (
  value: Prisma.JsonValue | null | undefined,
): value is Prisma.JsonObject =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const readJsonString = (
  object: Prisma.JsonObject | undefined,
  key: string,
): string | undefined => {
  const value = object?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const parseTaxSettings = (
  settings: Prisma.JsonValue | null | undefined,
): TaxSettings => {
  const settingsObject = isJsonObject(settings) ? settings : undefined;
  const rawTaxSettings = settingsObject?.taxSettings;
  const taxSettingsObject = isJsonObject(rawTaxSettings)
    ? rawTaxSettings
    : undefined;

  return taxSettingsSchema.parse({
    countryCode: 'IN',
    regime: 'IN_GST',
    registrationId: readJsonString(settingsObject, 'gstin'),
    ...taxSettingsObject,
  });
};

const parseTaxRegistrationSnapshot = (
  value: Prisma.JsonValue | null,
): TaxRegistrationSnapshot | undefined => {
  const parsed = taxRegistrationSnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
};

const parseInvoiceTaxSummary = (
  value: Prisma.JsonValue | null,
): InvoiceTaxSummary | undefined => {
  const parsed = invoiceTaxSummarySchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
};

const extractGstinStateCode = (gstin?: string): string | undefined => {
  const stateCode = gstin?.slice(0, 2);
  return stateCode && /^\d{2}$/.test(stateCode) ? stateCode : undefined;
};

const addDays = (date: Date, days: number): Date => {
  const dueDate = new Date(date);
  dueDate.setDate(dueDate.getDate() + days);
  return dueDate;
};

const extractClinicGstin = (
  clinic:
    | {
        gstin?: string | null;
        settings?: Prisma.JsonValue | null;
      }
    | null
    | undefined,
): string | undefined => {
  if (!clinic) return undefined;
  if (clinic.gstin) return clinic.gstin;

  const settings = clinic.settings;
  if (!isJsonObject(settings)) {
    return undefined;
  }

  const gstin = readJsonString(settings, 'gstin');
  if (gstin) {
    return gstin;
  }

  const taxSettings = isJsonObject(settings.taxSettings)
    ? settings.taxSettings
    : undefined;
  return readJsonString(taxSettings, 'registrationId');
};

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(INVOICE_REPOSITORY_TOKEN)
    private readonly repository: IInvoiceRepository,
    @Inject(PAYMENT_SESSION_REPOSITORY_TOKEN)
    private readonly paymentSessionRepository: IPaymentSessionRepository,
    private readonly prisma: PrismaService,
    private readonly pdfService: PDFService,
    private readonly taxCalculator: TaxCalculatorService,
    private readonly eventEmitter: EventEmitter2,
    private readonly usageTracking: UsageTrackingService,
    private readonly storageProvider: StorageProvider,
    private readonly claimValidationService: ClaimValidationService,
    @Inject(StoredFileUrlResolverService)
    private readonly storedFileUrlResolver: Pick<
      StoredFileUrlResolverService,
      'resolveWithStoredUrl'
    >,
    @Inject(PdfJobService)
    private readonly pdfJobService: PdfJobServicePort,
  ) {}

  private requiresClaimReadinessValidation(
    currentStatus: InvoiceStatus,
    targetStatus: InvoiceStatus,
  ): boolean {
    if (currentStatus === targetStatus) return false;
    return (
      targetStatus === InvoiceStatus.PAID ||
      targetStatus === InvoiceStatus.PARTIALLY_PAID ||
      targetStatus === InvoiceStatus.OVERDUE
    );
  }

  private buildTaxSnapshots(patient: PatientInvoiceContext): {
    taxSettings: TaxSettings;
    seller: TaxRegistrationSnapshot;
    buyer: TaxRegistrationSnapshot;
  } {
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
      legalName: `${patient.firstName} ${patient.lastName}`.trim(),
      address: patient.address || undefined,
      stateCode: seller.stateCode,
      stateName: seller.stateName,
    });

    return { taxSettings, seller, buyer };
  }

  private async calculateTaxForPatientInvoice(
    patientId: string,
    clinicId: string | undefined,
    items: InvoiceItem[],
  ): Promise<{
    patient: PatientInvoiceContext;
    taxSettings: TaxSettings;
    seller: TaxRegistrationSnapshot;
    buyer: TaxRegistrationSnapshot;
    calculation: ReturnType<TaxCalculatorService['calculateInvoice']>;
  }> {
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
      reverseCharge: false,
    });

    return { patient, taxSettings, seller, buyer, calculation };
  }

  async findAll(
    clinicId: string,
    params?: {
      cursor?: string;
      limit?: number;
      patientId?: string;
      status?: InvoiceStatus;
      date?: string;
      search?: string;
    },
  ) {
    const patientId = params?.patientId?.trim() || undefined;

    if (patientId) {
      const patient = await this.repository.findPatientContext(
        patientId,
        clinicId,
      );
      if (!patient) {
        throw new NotFoundException(`Patient ${patientId} not found`);
      }
    } else {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
        select: {
          tier: true,
          intelligenceAddon: true,
          features: true,
        },
      });
      if (!clinic) {
        throw new NotFoundException(`Clinic ${clinicId} not found`);
      }
      assertClinicHasFeatureOrThrow(
        {
          tier: clinic.tier,
          intelligenceAddon: clinic.intelligenceAddon,
          features: clinic.features,
        },
        Feature.INVOICING,
      );
    }

    return this.repository.findAll({
      clinicId,
      ...params,
      patientId,
    });
  }

  async findOne(id: string, clinicId: string): Promise<InvoiceDetail> {
    const invoice = await this.repository.findById(id, clinicId);
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }
    return invoice;
  }

  private extractPaymentActivityMeta(
    meta: Prisma.JsonValue | null | undefined,
  ): { channel?: string; reference?: string; notes?: string } {
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
      return {};
    }
    const m = meta as Record<string, unknown>;
    const channelRaw =
      typeof m.channel === 'string'
        ? m.channel
        : typeof m.method === 'string'
          ? m.method
          : undefined;
    const referenceRaw =
      typeof m.reference === 'string' ? m.reference : undefined;
    let notes: string | undefined;
    if (typeof m.notes === 'string' && m.notes.trim()) {
      notes = m.notes.trim().slice(0, 500);
    }
    return {
      channel: channelRaw?.trim() || undefined,
      reference: referenceRaw?.trim() || undefined,
      notes,
    };
  }

  private toPaymentActivityItem(
    session: PaymentSession,
  ): InvoicePaymentActivityItem {
    const { channel, reference, notes } = this.extractPaymentActivityMeta(
      session.meta,
    );
    return {
      id: session.id,
      provider: session.provider,
      status: session.status,
      amountCents: session.amount,
      currency: session.currency,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      shortUrl: session.shortUrl ?? undefined,
      paymentLink: session.paymentLink ?? undefined,
      channel,
      reference,
      notes,
    };
  }

  async listPaymentActivity(
    invoiceId: string,
    clinicId: string,
  ): Promise<InvoicePaymentActivityResponse> {
    const invoice = await this.repository.findById(invoiceId, clinicId);
    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }
    const sessions = await this.paymentSessionRepository.findByInvoiceId(
      invoiceId,
      clinicId,
    );
    return {
      items: sessions.map((s) => this.toPaymentActivityItem(s)),
    };
  }

  async create(data: {
    appointmentId?: string;
    patientId: string;
    total: number;
    status: InvoiceStatus;
    items: InvoiceItem[];
    doctorName?: string;
    doctorEmail?: string;
    doctorPhone?: string;
    doctorSpecialization?: string | null;
    doctorRole?: string | null;
    doctorRegistrationNumber?: string;
    doctorLicenseNumber?: string;
    clinicId?: string;
  }): Promise<InvoiceDetail> {
    const issuedAt = new Date();
    const { patient, taxSettings, seller, buyer, calculation } =
      await this.calculateTaxForPatientInvoice(
        data.patientId,
        data.clinicId,
        data.items,
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
    });

    this.eventEmitter.emit('invoice.generated', {
      invoiceId: invoice.id,
      clinicId: patient.clinic.id,
    });
    this.usageTracking
      .trackInvoice(patient.clinic.id, invoice.id)
      .catch(() => {});

    return invoice;
  }

  async update(
    id: string,
    data: { status?: InvoiceStatus; total?: number; items?: InvoiceItem[] },
    clinicId: string,
  ): Promise<InvoiceDetail> {
    const existing = await this.findOne(id, clinicId);

    if (
      data.status &&
      this.requiresClaimReadinessValidation(existing.status, data.status)
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

  async getClaimReadiness(
    id: string,
    clinicId: string,
  ): Promise<ClaimReadinessResult> {
    return this.claimValidationService.evaluateClaimReadiness(id, clinicId);
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
    const invoice = await this.findOne(id, clinicId);

    return {
      invoiceId: invoice.id,
      claimReady: true,
      submittedAt: new Date().toISOString(),
      status: invoice.status,
    };
  }

  async remove(id: string, clinicId: string): Promise<void> {
    await this.repository.delete(id, clinicId);
  }

  async generatePDF(id: string, clinicId: string): Promise<Buffer> {
    const invoice = await this.findOne(id, clinicId);

    const items = parseInvoiceItems(invoice.items);
    const taxSummary = parseInvoiceTaxSummary(invoice.taxSummary);
    const sellerTaxSnapshot = parseTaxRegistrationSnapshot(
      invoice.sellerTaxSnapshot,
    );
    const buyerTaxSnapshot = parseTaxRegistrationSnapshot(
      invoice.buyerTaxSnapshot,
    );
    const patient = invoice.patient;
    const clinic = patient?.clinic;
    if (!clinic?.name) {
      throw new BadRequestException(
        'Clinic details are required to generate invoice PDF',
      );
    }
    const doctorName = invoice.appointment?.doctor?.name || invoice.doctorName;
    if (!doctorName) {
      throw new BadRequestException(
        'Doctor details are required to generate invoice PDF',
      );
    }

    const procedureCptMap: Record<string, string> = {};
    if (invoice.appointment?.procedures) {
      for (const proc of invoice.appointment.procedures) {
        if (proc.cptCode?.code) {
          procedureCptMap[proc.description] = proc.cptCode.code;
        }
      }
    }

    const resolvedSignature =
      await this.storedFileUrlResolver.resolveWithStoredUrl(
        clinic.slaSignatureUrl ?? null,
      );

    return this.pdfService.generate({
      invoiceId: invoice.invoiceNumber ?? invoice.id.slice(0, 8).toUpperCase(),
      title:
        taxSummary?.documentTitle ??
        (invoice.invoiceType === 'TAX_INVOICE'
          ? 'Tax Invoice'
          : 'Bill of Supply'),
      clinic: {
        name: clinic.name,
        address: clinic.address || undefined,
        phone: clinic.phone || undefined,
        email: clinic.email || undefined,
        logo: clinic.logo || undefined,
        currency: clinic.currency || undefined,
        branding: extractPdfTheme(clinic.branding),
        gstin: sellerTaxSnapshot?.registrationId ?? extractClinicGstin(clinic),
      },
      patient: {
        name: `${patient?.firstName} ${patient?.lastName}`,
        phoneNumber: patient?.phoneNumber || '',
        email: patient?.email || undefined,
        address: patient?.address || undefined,
        patientId: patient?.id.slice(0, 8).toUpperCase() || '',
      },
      doctor: invoice.appointment?.doctor
        ? {
            name: invoice.appointment.doctor.name,
            qualification:
              invoice.appointment.doctor.qualification || undefined,
            registrationNumber:
              invoice.appointment.doctor.registrationNumber || undefined,
          }
        : {
            name: doctorName,
            qualification: invoice.doctorSpecialization || undefined,
            registrationNumber: invoice.doctorRegistrationNumber || undefined,
          },
      authorizedSignatureUrl: resolvedSignature.url ?? undefined,
      authorizedSignatureLabel: 'Authorized Signature',
      taxSummary,
      sellerTaxSnapshot,
      buyerTaxSnapshot,
      items: items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? item.price,
        amount:
          item.lineTotal ??
          item.quantity * (item.unitPrice ?? item.price) -
            (item.discountAmount ?? 0) +
            (item.taxAmount ?? 0),
        cptCode: item.cptCode ?? procedureCptMap[item.description],
        hsnCode: item.hsnCode ?? item.sacCode,
        gstRate: item.taxRate,
      })),
      status: invoice.status.toUpperCase(),
      date: new Date(invoice.issuedAt ?? invoice.createdAt),
      dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
    });
  }

  async getPdf(
    id: string,
    clinicId: string,
  ): Promise<
    { type: 'url'; url: string } | { type: 'buffer'; buffer: Buffer }
  > {
    if (this.storageProvider.supportsSignedUrls) {
      const invoice = await this.findOne(id, clinicId);

      if (invoice.pdfUrl) {
        const url = await this.storageProvider.generateSignedUrl(
          invoice.pdfUrl,
          PDF_SIGNED_URL_TTL_SECONDS,
        );
        return { type: 'url', url };
      }

      const buffer = await this.generatePDF(id, clinicId);
      const { storedKey } = await this.uploadAndPersist(
        id,
        clinicId,
        buffer,
        invoice,
      );

      const url = await this.storageProvider.generateSignedUrl(
        storedKey,
        PDF_SIGNED_URL_TTL_SECONDS,
      );
      return { type: 'url', url };
    }

    const buffer = await this.generatePDF(id, clinicId);
    return { type: 'buffer', buffer };
  }

  async generatePdfAsync(
    id: string,
    clinicId: string,
  ): Promise<EnqueuePdfJobResponse> {
    return this.pdfJobService.enqueue(id, 'invoice', clinicId);
  }

  async uploadAndPersist(
    id: string,
    clinicId: string,
    buffer: Buffer,
    invoice: InvoiceDetail,
  ): Promise<{ storedKey: string; generatedAt: Date }> {
    const objectKey = `pdfs/invoices/${id}.pdf`;
    const generatedAt = new Date();
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
