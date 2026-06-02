import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  INVOICE_TAX_CALCULATOR_TOKEN,
  type IInvoiceTaxCalculator,
} from '@/domains/billing/application/ports';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { Prisma } from '@workspace/db';
import {
  taxRegistrationSnapshotSchema,
  taxSettingsSchema,
  DEFAULT_TAX_COUNTRY_CODE,
  DEFAULT_TAX_CURRENCY,
  DEFAULT_TAX_REGIME,
  extractStateCodeFromGstin,
  type InvoiceTaxSummary,
  type TaxRegistrationSnapshot,
} from '@workspace/types';

// AuditLogged: tax calculation helper; payment mutations audited in subscription command services

const roundCurrency = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

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

@Injectable()
export class SubscriptionPaymentTaxCalculator {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(INVOICE_TAX_CALCULATOR_TOKEN)
    private readonly taxCalculator: IInvoiceTaxCalculator,
    private readonly configService: AppConfigService,
  ) {}

  async calculate(payment: {
    clinicId: string;
    amountCents: number;
    currency: string;
    description: string;
  }): Promise<{
    invoiceType: string;
    subtotalCents: number;
    taxCents: number;
    grandTotalCents: number;
    taxSummary: InvoiceTaxSummary;
    seller: TaxRegistrationSnapshot;
    buyer: TaxRegistrationSnapshot;
  }> {
    const clinic = await this.prisma.getReadClient().clinic.findUnique({
      where: { id: payment.clinicId },
      select: {
        id: true,
        name: true,
        address: true,
        currency: true,
        settings: true,
      },
    });
    const platformTaxConfig = this.configService.getPlatformTaxConfig();
    const seller = taxRegistrationSnapshotSchema.parse(
      platformTaxConfig.seller,
    );
    const taxSettings = taxSettingsSchema.parse({
      countryCode: DEFAULT_TAX_COUNTRY_CODE,
      regime: DEFAULT_TAX_REGIME,
      ...this.extractClinicTaxSettings(clinic?.settings),
    });
    const buyer = taxRegistrationSnapshotSchema.parse({
      countryCode: taxSettings.countryCode,
      regime: taxSettings.regime,
      registrationId: taxSettings.registrationId,
      registrationLabel: taxSettings.registrationLabel,
      legalName: taxSettings.legalName?.trim() || clinic?.name,
      address: clinic?.address ?? undefined,
      stateCode: taxSettings.stateCode,
      stateName: taxSettings.stateName,
    });

    const taxRate =
      payment.currency === DEFAULT_TAX_CURRENCY &&
      seller.countryCode === DEFAULT_TAX_COUNTRY_CODE
        ? platformTaxConfig.subscriptionTaxRate
        : 0;
    const grandTotal = roundCurrency(payment.amountCents / 100);
    const subtotal =
      taxRate > 0
        ? roundCurrency(grandTotal / (1 + taxRate / 100))
        : grandTotal;
    const calculation = this.taxCalculator.calculateInvoice({
      currency: payment.currency || clinic?.currency || DEFAULT_TAX_CURRENCY,
      seller,
      buyer,
      placeOfSupply: {
        countryCode: buyer.countryCode ?? seller.countryCode,
        stateCode: buyer.stateCode ?? seller.stateCode,
        stateName: buyer.stateName ?? seller.stateName,
      },
      items: [
        {
          description: payment.description,
          quantity: 1,
          price: subtotal,
          taxTreatment: taxRate > 0 ? 'TAXABLE' : 'EXEMPT',
          taxRate,
          sacCode: '998313',
        },
      ],
    });

    return {
      invoiceType: calculation.invoiceType,
      subtotalCents: Math.round(calculation.subtotal * 100),
      taxCents: Math.round(calculation.taxTotal * 100),
      grandTotalCents: payment.amountCents,
      taxSummary: {
        ...calculation.summary,
        grandTotal,
      },
      seller,
      buyer,
    };
  }

  private extractClinicTaxSettings(
    settings: Prisma.JsonValue | null | undefined,
  ): Record<string, string | undefined> {
    const settingsObject = isJsonObject(settings) ? settings : undefined;
    const taxSettings = settingsObject?.taxSettings;
    const taxSettingsObject = isJsonObject(taxSettings)
      ? taxSettings
      : undefined;

    const registrationId =
      readJsonString(settingsObject, 'gstin') ??
      readJsonString(taxSettingsObject, 'registrationId');
    const explicitStateCode = readJsonString(taxSettingsObject, 'stateCode');
    const derivedStateCode = extractStateCodeFromGstin(registrationId);

    return {
      registrationId,
      registrationLabel: readJsonString(taxSettingsObject, 'registrationLabel'),
      countryCode: readJsonString(taxSettingsObject, 'countryCode'),
      regime: readJsonString(taxSettingsObject, 'regime'),
      stateCode: explicitStateCode ?? derivedStateCode,
      stateName: readJsonString(taxSettingsObject, 'stateName'),
      legalName: readJsonString(taxSettingsObject, 'legalName'),
    };
  }
}
