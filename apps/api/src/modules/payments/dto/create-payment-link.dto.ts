import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { PaymentMode } from '@workspace/types';

// Re-export for backward compatibility
export { PaymentMode };

export class CreatePaymentLinkDto {
  @IsString()
  invoiceId: string;

  @IsNumber()
  amount: number; // in rupees (will convert to paise)

  @IsString()
  @IsOptional()
  currency?: string = 'INR';

  @IsEnum(PaymentMode)
  @IsOptional()
  paymentMode?: PaymentMode = PaymentMode.ONLINE;

  @IsString()
  patientId: string;

  @IsString()
  clinicId: string;

  @IsBoolean()
  @IsOptional()
  sendWhatsApp?: boolean = true;

  @IsString()
  @IsOptional()
  description?: string;
}
