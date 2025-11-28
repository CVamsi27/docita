import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { TIER_KEY, Tier } from './tier.decorator';

@Injectable()
export class TierGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private prisma: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredTier = this.reflector.getAllAndOverride<Tier>(TIER_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (requiredTier === undefined) {
            return true; // No tier requirement
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.clinicId) {
            throw new ForbiddenException('User not associated with a clinic');
        }

        // Fetch clinic tier
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: user.clinicId },
            select: { tier: true },
        });

        if (!clinic) {
            throw new ForbiddenException('Clinic not found');
        }

        // Map string tier to enum
        const tierMap: Record<string, Tier> = {
            FREE: Tier.FREE,
            STARTER: Tier.STARTER,
            PROFESSIONAL: Tier.PRO,
            ENTERPRISE: Tier.ENTERPRISE,
        };

        const userTier = tierMap[clinic.tier] ?? Tier.FREE;

        if (userTier < requiredTier) {
            throw new ForbiddenException(
                `This feature requires ${Tier[requiredTier]} tier or higher`,
            );
        }

        return true;
    }
}
