import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import {
  IUserRepository,
  USER_REPOSITORY_TOKEN,
} from '@/domains/users/core/repositories/user.repository.interface';

interface UpdateProfileDto {
  name?: string;
  email?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private repository: IUserRepository,
  ) {}

  async update(userId: string, data: { onboardingStep?: string }) {
    if (data.onboardingStep) {
      await this.repository.updateOnboardingStep(userId, data.onboardingStep);
    }
  }

  async updateProfile(userId: string, data: UpdateProfileDto) {
    const user = await this.repository.findById(userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (data.email && data.email !== user.email) {
      const existingUser = await this.repository.findByEmail(data.email);

      if (existingUser) {
        throw new BadRequestException('Email is already in use');
      }
    }

    return this.repository.updateProfile(userId, data);
  }
}
