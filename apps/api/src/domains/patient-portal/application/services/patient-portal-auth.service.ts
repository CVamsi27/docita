import { Injectable } from '@nestjs/common';
import { PatientPortalAuthCommandService } from './patient-portal-auth-command.service';

/**
 * Facade — delegates patient portal authentication to PatientPortalAuthCommandService.
 */
@Injectable()
export class PatientPortalAuthService {
  constructor(
    private readonly commandService: PatientPortalAuthCommandService,
  ) {}

  requestOtp(phoneNumber: string) {
    return this.commandService.requestOtp(phoneNumber);
  }

  verifyOtp(phoneNumber: string, otp: string) {
    return this.commandService.verifyOtp(phoneNumber, otp);
  }
}
