import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { PublicBookingService } from '@/domains/public-booking/application/services/public-booking.service';
import { publicBookingSlotsQuerySchema } from '@workspace/types';
import { getClientIp } from '@/shared/common/http/client-ip';

@ApiTags('public-booking')
@Controller('public/booking/clinics')
@Public()
export class PublicBookingController {
  constructor(private readonly publicBookingService: PublicBookingService) {}

  @Get(':referralCode')
  @ApiOperation({ summary: 'Public clinic summary for online booking' })
  getClinic(@Param('referralCode') referralCode: string) {
    return this.publicBookingService.getClinicSummary(referralCode);
  }

  @Get(':referralCode/doctors')
  @ApiOperation({ summary: 'List doctors available for public booking' })
  listDoctors(@Param('referralCode') referralCode: string) {
    return this.publicBookingService.listDoctors(referralCode);
  }

  @Get(':referralCode/slots')
  @ApiOperation({ summary: 'Available slots for a doctor on a calendar date' })
  listSlots(
    @Param('referralCode') referralCode: string,
    @Query() query: Record<string, unknown>,
  ) {
    const parsed = publicBookingSlotsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException('Invalid slot query');
    }
    return this.publicBookingService.listSlots(referralCode, parsed.data);
  }

  @Throttle({ short: { ttl: 60000, limit: 10 } })
  @Post(':referralCode/phone-check')
  @ApiOperation({ summary: 'Whether WhatsApp OTP is required for this phone' })
  checkPhone(
    @Param('referralCode') referralCode: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    return this.publicBookingService.checkPhoneStatus(
      referralCode,
      body,
      getClientIp(req),
    );
  }

  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Post(':referralCode/otp/request')
  @ApiOperation({ summary: 'Request WhatsApp OTP for returning patients' })
  requestOtp(
    @Param('referralCode') referralCode: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    return this.publicBookingService.requestOtp(
      referralCode,
      body,
      getClientIp(req),
    );
  }

  @Throttle({ short: { ttl: 60000, limit: 10 } })
  @Post(':referralCode/otp/verify')
  @ApiOperation({ summary: 'Verify OTP and issue booking verification token' })
  verifyOtp(
    @Param('referralCode') referralCode: string,
    @Body() body: unknown,
  ) {
    return this.publicBookingService.verifyOtp(referralCode, body);
  }

  @Get(':referralCode/context')
  @ApiOperation({
    summary: 'Recent appointments for verified returning patient',
  })
  getContext(
    @Param('referralCode') referralCode: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.publicBookingService.getBookingContext(
      referralCode,
      authorization,
    );
  }

  @Throttle({ short: { ttl: 60000, limit: 20 } })
  @Post(':referralCode/requests')
  @ApiOperation({ summary: 'Submit a public appointment request' })
  submitRequest(
    @Param('referralCode') referralCode: string,
    @Body() body: unknown,
    @Headers('authorization') authorization: string | undefined,
    @Req() req: Request,
  ) {
    return this.publicBookingService.submitRequest(
      referralCode,
      body,
      authorization,
      getClientIp(req),
      req.headers['user-agent'],
    );
  }
}
