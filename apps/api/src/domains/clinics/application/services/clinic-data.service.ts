import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ClinicTier, ClinicType } from '@workspace/db';
import { ClinicFactory } from '@/domains/clinics/core/factories/clinic.factory';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  IClinicDataRepository,
  CLINIC_DATA_REPOSITORY_TOKEN,
  CreateClinicInput,
  ClinicSearchResult,
} from '@/domains/clinics/core/repositories/clinic-data.repository.interface';

interface CreateClinicData {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  tier?: ClinicTier;
  type?: ClinicType;
  settings?: unknown;
}

interface UpdateClinicData {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  tier?: ClinicTier;
  type?: ClinicType;
  settings?: unknown;
}

interface JoinClinicData {
  clinicCode?: string;
  clinicEmail?: string;
}

@Injectable()
export class ClinicDataService {
  constructor(
    @Inject(CLINIC_DATA_REPOSITORY_TOKEN)
    private readonly repository: IClinicDataRepository,
    private clinicFactory: ClinicFactory,
    private configService: AppConfigService,
  ) {}

  private toRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object') {
      return {};
    }
    return Object.fromEntries(Object.entries(value as object));
  }

  private readString(
    source: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const value = source[key];
    return typeof value === 'string' ? value : undefined;
  }

  private readStringArray(
    source: Record<string, unknown>,
    key: string,
  ): string[] | undefined {
    const value = source[key];
    if (!Array.isArray(value)) return undefined;
    const normalized = value.filter(
      (item): item is string => typeof item === 'string',
    );
    return normalized.length > 0 ? normalized : [];
  }

  private readNumber(
    source: Record<string, unknown>,
    key: string,
  ): number | undefined {
    const value = source[key];
    return typeof value === 'number' ? value : undefined;
  }

  private generateReferralCode(clinicName: string): string {
    const prefix = clinicName
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 3)
      .padEnd(3, 'X');
    const suffix = Math.random().toString(36).toUpperCase().slice(2, 6);
    return `${prefix}-${suffix}`;
  }

  async create(data: CreateClinicData) {
    const clinicInput = this.clinicFactory.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      tier: data.tier,
      settings: this.toRecord(data.settings),
    });

    let referralCode = this.generateReferralCode(data.name);
    let attempts = 0;
    while (attempts < 5) {
      const existing = await this.repository.findByReferralCode(referralCode);
      if (!existing) break;
      referralCode = this.generateReferralCode(data.name);
      attempts++;
    }

    return this.repository.create({
      ...clinicInput,
      logo: data.logo,
      type: data.type,
      referralCode,
      subscriptionStatus: this.configService.isProduction()
        ? undefined
        : 'TRIALING',
    } as unknown as CreateClinicInput);
  }

  async findAll() {
    return this.repository.findAll();
  }

  async findOne(id: string) {
    const clinic = await this.repository.findById(id);
    if (!clinic) return null;

    const raw = clinic as { settings?: unknown; phone?: string } & Record<
      string,
      unknown
    >;
    const settings = this.toRecord(raw.settings);
    return {
      ...raw,
      phoneNumber: raw.phone,
      description: this.readString(settings, 'description'),
      openingTime: this.readString(settings, 'openingTime'),
      closingTime: this.readString(settings, 'closingTime'),
      workingDays: this.readStringArray(settings, 'workingDays'),
      consultationDuration: this.readNumber(settings, 'consultationDuration'),
    };
  }

  async update(id: string, data: UpdateClinicData) {
    return this.repository.update(id, {
      name: data.name,
      address: data.address,
      phone: data.phone,
      email: data.email,
      logo: data.logo,
      tier: data.tier,
      type: data.type,
      settings: this.toRecord(data.settings),
    });
  }

  async delete(id: string) {
    return this.repository.softDelete(id);
  }

  async getUserClinics(userId: string) {
    const doctorClinics = (await this.repository.findDoctorClinics(
      userId,
    )) as Array<{
      clinic: { settings?: unknown; phone?: string } & Record<string, unknown>;
    }>;

    return doctorClinics.map((dc) => {
      const clinic = dc.clinic;
      const settings = this.toRecord(clinic.settings);
      return {
        ...clinic,
        phoneNumber: clinic.phone,
        description: this.readString(settings, 'description'),
        openingTime: this.readString(settings, 'openingTime'),
        closingTime: this.readString(settings, 'closingTime'),
        workingDays: this.readStringArray(settings, 'workingDays'),
        consultationDuration: this.readNumber(settings, 'consultationDuration'),
      };
    });
  }

  async getClinicStats(clinicId: string) {
    return this.repository.getStats(clinicId);
  }

  async joinClinicForUser(userId: string, data: JoinClinicData) {
    const user = await this.repository.findUserForJoin(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.clinicId) {
      throw new BadRequestException('User is already associated with a clinic');
    }

    const normalizedCode = data.clinicCode?.trim().toUpperCase();
    const normalizedEmail = data.clinicEmail?.trim().toLowerCase();

    if (!normalizedCode && !normalizedEmail) {
      throw new BadRequestException('clinicCode or clinicEmail is required');
    }

    const clinic = await this.repository.findClinicByCodeOrEmail(
      normalizedCode,
      normalizedEmail,
    );

    if (!clinic) {
      throw new NotFoundException(
        'No active clinic found for provided details',
      );
    }

    await this.repository.joinClinic(userId, clinic.id, user.role);

    return {
      success: true,
      clinic: {
        id: clinic.id,
        name: clinic.name,
        email: clinic.email,
        referralCode: clinic.referralCode,
      },
    };
  }

  async searchActive(query: string): Promise<ClinicSearchResult[]> {
    return this.repository.searchActive(query);
  }
}
