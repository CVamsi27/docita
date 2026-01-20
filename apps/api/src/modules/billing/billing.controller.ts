import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { BillingService } from './billing.service';
import {
  BillingPortalUrlResponseDto,
  InvoiceListResponseDto,
  PaymentMethodListResponseDto,
  CheckoutSessionResponseDto,
  ChangeTierDto,
  TierChangeResponseDto,
} from './dto/billing.dto';
import { ZodSerializerDto } from 'nestjs-zod';

interface AuthRequest {
  user: {
    clinicId: string;
  };
}

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('portal')
  @Roles('ADMIN', 'ADMIN_DOCTOR')
  @ZodSerializerDto(BillingPortalUrlResponseDto)
  async getBillingPortal(@Request() req: AuthRequest) {
    return this.billingService.getBillingPortalUrl(req.user.clinicId);
  }

  @Get('invoices')
  @Roles('ADMIN', 'ADMIN_DOCTOR')
  @ZodSerializerDto(InvoiceListResponseDto)
  async getInvoices(@Request() req: AuthRequest) {
    return this.billingService.getInvoices(req.user.clinicId);
  }

  @Get('payment-methods')
  @Roles('ADMIN', 'ADMIN_DOCTOR')
  @ZodSerializerDto(PaymentMethodListResponseDto)
  async getPaymentMethods(@Request() req: AuthRequest) {
    return this.billingService.getPaymentMethods(req.user.clinicId);
  }

  @Post('checkout')
  @Roles('ADMIN', 'ADMIN_DOCTOR')
  @ZodSerializerDto(CheckoutSessionResponseDto)
  async createCheckoutSession(@Request() req: AuthRequest) {
    return this.billingService.createCheckoutSession(req.user.clinicId);
  }

  @Post('create-checkout-session')
  @Roles('ADMIN', 'ADMIN_DOCTOR')
  @ZodSerializerDto(CheckoutSessionResponseDto)
  async createCheckoutSessionAlias(@Request() req: AuthRequest) {
    return this.billingService.createCheckoutSession(req.user.clinicId);
  }

  @Post('change-tier')
  @Roles('ADMIN', 'ADMIN_DOCTOR')
  @ZodSerializerDto(TierChangeResponseDto)
  async changeTier(@Request() req: AuthRequest, @Body() body: ChangeTierDto) {
    return this.billingService.changeTier(req.user.clinicId, body.tier);
  }
}
