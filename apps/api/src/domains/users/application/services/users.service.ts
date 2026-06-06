import {
  Injectable,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import {
  IUserRepository,
  USER_REPOSITORY_TOKEN,
} from '@/domains/users/core/repositories/user.repository.interface';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

interface UpdateProfileDto {
  name?: string;
  email?: string;
  sidebarNavOrderOverride?: unknown | null;
}

/**
 * Thin facade — delegates user profile updates to IUserRepository.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private repository: IUserRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async update(userId: string, data: { onboardingStep?: string }) {
    if (data.onboardingStep) {
      await this.repository.updateOnboardingStep(userId, data.onboardingStep);
    }
  }

  async updateProfile(userId: string, data: UpdateProfileDto) {
    const user = await this.repository.findById(userId);

    if (!user) throw new BadRequestException('User not found');

    if (data.email && data.email !== user.email) {
      const existingUser = await this.repository.findByEmail(data.email);

      if (existingUser)
        throw new BadRequestException('Email is already in use');
    }

    return this.repository.updateProfile(userId, data);
  }

  async getProfile(userId: string) {
    return this.repository.getProfile(userId);
  }

  async requestAccountDeletion(userId: string) {
    const user = await this.repository.findById(userId);

    if (!user) throw new BadRequestException('User not found');

    this.logger.log('Staff user requested account deletion');

    return {
      message:
        'Your account deletion request has been received. Our team will process it within 30 days per applicable data protection guidelines.',
      userId,
      requestedAt: this.clock.now().toISOString(),
    };
  }
}
