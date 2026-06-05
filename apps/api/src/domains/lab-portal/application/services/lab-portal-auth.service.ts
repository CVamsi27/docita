import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '@/shared/modules/auth/auth/auth.service';
import { AuthSessionService } from '@/shared/modules/auth/auth/auth-session.service';
import { LabPortalLoginInput } from '../dto/lab-portal-auth.dto';
import { Role } from '@workspace/db';

@Injectable()
export class LabPortalAuthCommandService {
  constructor(
    private readonly authService: AuthService,
    private readonly authSessionService: AuthSessionService,
  ) {}

  async login(dto: LabPortalLoginInput) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    if (!user || user.role !== Role.LAB) {
      throw new UnauthorizedException(
        'Invalid credentials or not a lab technician account.',
      );
    }

    return this.authSessionService.login(user);
  }
}
