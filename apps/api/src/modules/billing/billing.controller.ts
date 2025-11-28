import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { BillingService } from './billing.service';

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
  async getBillingPortal(@Request() req: AuthRequest) {
    return this.billingService.getBillingPortalUrl(req.user.clinicId);
  }

  @Get('invoices')
  @Roles('ADMIN', 'ADMIN_DOCTOR')
  async getInvoices(@Request() req: AuthRequest) {
    return this.billingService.getInvoices(req.user.clinicId);
  }

  @Get('payment-methods')
  @Roles('ADMIN', 'ADMIN_DOCTOR')
  async getPaymentMethods(@Request() req: AuthRequest) {
    return this.billingService.getPaymentMethods(req.user.clinicId);
  }

  @Post('checkout')
  @Roles('ADMIN', 'ADMIN_DOCTOR')
  async createCheckoutSession(@Request() req: AuthRequest) {
    return this.billingService.createCheckoutSession(req.user.clinicId);
  }

  @Post('create-checkout-session')
  @Roles('ADMIN', 'ADMIN_DOCTOR')
  async createCheckoutSessionAlias(@Request() req: AuthRequest) {
    return this.billingService.createCheckoutSession(req.user.clinicId);
  }
}
