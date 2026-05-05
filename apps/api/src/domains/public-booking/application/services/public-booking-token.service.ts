import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

export const PUBLIC_BOOKING_JWT_PURPOSE = 'public_booking';

export interface PublicBookingTokenPayload {
  purpose: typeof PUBLIC_BOOKING_JWT_PURPOSE;
  clinicId: string;
  patientId: string;
  phoneNumber: string;
}

@Injectable()
export class PublicBookingTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly appConfig: AppConfigService,
  ) {}

  sign(payload: PublicBookingTokenPayload): string {
    return this.jwtService.sign(
      { ...payload },
      {
        secret: this.appConfig.getJwtSecret(),
        expiresIn: '15m',
      },
    );
  }

  verify(token: string): PublicBookingTokenPayload {
    try {
      const decoded = this.jwtService.verify<PublicBookingTokenPayload>(token, {
        secret: this.appConfig.getJwtSecret(),
      });
      if (
        !decoded ||
        decoded.purpose !== PUBLIC_BOOKING_JWT_PURPOSE ||
        !decoded.clinicId ||
        !decoded.patientId ||
        !decoded.phoneNumber
      ) {
        throw new UnauthorizedException('Invalid booking verification');
      }
      return decoded;
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired booking verification',
      );
    }
  }
}
