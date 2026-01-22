import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@workspace/db';
import { IPasswordPolicy } from './policies/password.policy';
import { UserFactory } from '../users/factories/user.factory';
import { ClinicFactory } from '../clinics/factories/clinic.factory';

interface UserWithoutPassword {
  id: string;
  email: string;
  name: string;
  role: Role;
  clinicId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: Role;
  clinicId?: string;
  clinicName?: string;
}

interface ChangePasswordData {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject('IPasswordPolicy') private passwordPolicy: IPasswordPolicy,
    private userFactory: UserFactory,
    private clinicFactory: ClinicFactory,
  ) {}

  async checkEmailExists(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return !!user;
  }

  async validateUser(
    email: string,
    pass: string,
  ): Promise<UserWithoutPassword | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  login(user: UserWithoutPassword) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      name: user.name,
      clinicId: user.clinicId,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        clinicId: user.clinicId,
      },
    };
  }

  async register(data: RegisterData) {
    // Validate password strength
    this.passwordPolicy.validate(data.password);

    const hashedPassword = await bcrypt.hash(data.password, 10);
    // If clinicName is provided, default role to ADMIN (owner), otherwise DOCTOR (staff)
    const defaultRole = data.clinicName ? Role.ADMIN : Role.DOCTOR;
    const role = data.role || defaultRole;

    const userData = this.userFactory.create(role, {
      email: data.email,
      name: data.name,
      passwordHash: hashedPassword,
      clinicId: data.clinicId, // May be undefined if creating new clinic
    });

    if (data.clinicName) {
      // Create Clinic + User Transaction
      const clinicData = this.clinicFactory.create({
        name: data.clinicName,
        email: data.email, // Use admin email as clinic contact initially
      });

      const clinic = await this.prisma.clinic.create({
        data: {
          ...clinicData,
          users: {
            create: userData, // Create user nested
          },
        },
        include: {
          users: true, // Return users to get the created user ID
        },
      });

      const newUser = clinic.users[0];
      return this.login(newUser);
    }

    // Standard User Creation (e.g. Patient)
    const user = await this.prisma.user.create({
      data: userData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        clinicId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return this.login(user);
  }

  async changePassword(data: ChangePasswordData) {
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(
      data.currentPassword,
      user.password,
    );
    if (!passwordMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Prevent using the same password
    const samePassword = await bcrypt.compare(data.newPassword, user.password);
    if (samePassword) {
      throw new UnauthorizedException(
        'New password must be different from current password',
      );
    }

    // Validate new password strength
    this.passwordPolicy.validate(data.newPassword);

    // Hash new password
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: data.userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }
}
