import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HospitalGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.clinicId) {
      return false;
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: user.clinicId },
      select: { facilityType: true },
    });

    return clinic?.facilityType === 'HOSPITAL';
  }
}
