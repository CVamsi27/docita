import { Injectable } from '@nestjs/common';
import {
  PRICING_CURRENCY_CONFIG,
  PRICING_CURRENCY_SYMBOLS,
  type SupportedCurrency,
} from '@workspace/types';
import { parseStringEnumMember } from '@workspace/utils';

const SUPPORTED_CURRENCY_MEMBERS = Object.keys(PRICING_CURRENCY_CONFIG).filter(
  (key): key is SupportedCurrency => key in PRICING_CURRENCY_CONFIG,
);

@Injectable()
export class OverageInvoiceComposer {
  resolveCurrency(currency?: string): SupportedCurrency {
    const selected = currency
      ? parseStringEnumMember(
          SUPPORTED_CURRENCY_MEMBERS,
          currency.toUpperCase(),
        )
      : null;
    if (selected) {
      return selected;
    }

    return 'INR';
  }

  getCurrencySymbol(currency?: string): string {
    const resolved = this.resolveCurrency(currency);
    return PRICING_CURRENCY_SYMBOLS[resolved] ?? resolved;
  }

  getPeriodKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  buildOverageInvoiceNumber(clinicId: string, periodStart: Date): string {
    const clinicSuffix = clinicId.slice(-6).toUpperCase();
    const periodCode = `${periodStart.getFullYear()}${String(periodStart.getMonth() + 1).padStart(2, '0')}`;
    return `OVG-${periodCode}-${clinicSuffix}`;
  }

  formatUsageMeterLabel(meterKey: string): string {
    const labels: Record<string, string> = {
      consultations: 'Completed consultations',
      users: 'Team seats',
      whatsappMessages: 'WhatsApp messages',
    };
    return labels[meterKey] ?? meterKey;
  }

  buildOverageDescription(
    periodStart: Date,
    periodEnd: Date,
    currency: string,
    breakdown: Record<
      string,
      { quantity: number; rate: number; charge: number }
    >,
  ): string {
    const currencySymbol = this.getCurrencySymbol(currency);
    const lineItems = Object.entries(breakdown)
      .filter(([, item]) => item.charge > 0)
      .map(
        ([meter, item]) =>
          `${this.formatUsageMeterLabel(meter)}: ${item.quantity} x ${currencySymbol}${item.rate} = ${currencySymbol}${item.charge.toFixed(2)}`,
      )
      .join(' | ');

    return `Usage overage invoice (${this.getPeriodKey(periodStart)}) ${periodStart.toISOString().slice(0, 10)} to ${periodEnd.toISOString().slice(0, 10)}.${lineItems ? ` ${lineItems}` : ''}`;
  }
}
