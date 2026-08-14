import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ClinicFactory } from '@/domains/clinics/core/factories/clinic.factory';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';
import {
  IClinicDataRepository,
  CLINIC_DATA_REPOSITORY_TOKEN,
} from '@/domains/clinics/core/repositories/clinic-data.repository.interface';
import {
  attachResolvedClinicSignatureUrl,
  generateReferralCode,
  readNumber,
  readOptionalString,
  readString,
  readStringArray,
  toInputJsonValue,
  toRecord,
} from './clinic-data.helpers';
import type {
  CreateClinicData,
  JoinClinicData,
  UpdateClinicData,
} from './clinic-data.types';

@Injectable()
export class ClinicDataCommandService {
  constructor(
    @Inject(CLINIC_DATA_REPOSITORY_TOKEN)
    private readonly repository: IClinicDataRepository,
    private readonly clinicFactory: ClinicFactory,
    private readonly configService: AppConfigService,
    private readonly storedFileUrlResolver: StoredFileUrlResolverService,
  ) {}

  async create(data: CreateClinicData) {
    const clinicInput = this.clinicFactory.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      tier: data.tier,
      settings: toRecord(data.settings),
    });

    let referralCode = generateReferralCode(data.name);
    let attempts = 0;
    while (attempts < 5) {
      const existing = await this.repository.findByReferralCode(referralCode);
      if (!existing) break;
      referralCode = generateReferralCode(data.name);
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
      settings: toInputJsonValue(clinicInput.settings),
    });
  }

  async update(id: string, data: UpdateClinicData) {
    const clinic = await this.repository.update(id, {
      name: data.name,
      address: data.address,
      phone: data.phone,
      email: data.email,
      logo: data.logo,
      tier: data.tier,
      type: data.type,
      settings: toInputJsonValue(data.settings),
    });

    const settings = toRecord(clinic.settings);
    return attachResolvedClinicSignatureUrl(
      {
        ...clinic,
        phoneNumber: clinic.phone,
        gstin: readOptionalString(settings, 'gstin'),
        description: readString(settings, 'description'),
        openingTime: readString(settings, 'openingTime'),
        closingTime: readString(settings, 'closingTime'),
        workingDays: readStringArray(settings, 'workingDays'),
        consultationDuration: readNumber(settings, 'consultationDuration'),
      },
      this.storedFileUrlResolver,
    );
  }

  async delete(id: string) {
    return this.repository.softDelete(id);
  }

  async joinClinicForUser(userId: string, data: JoinClinicData) {
    const user = await this.repository.findUserForJoin(userId);

    if (!user) throw new NotFoundException('User not found');

    if (user.clinicId)
      throw new BadRequestException('User is already associated with a clinic');

    const normalizedCode = data.clinicCode?.trim().toUpperCase();
    const normalizedEmail = data.clinicEmail?.trim().toLowerCase();

    if (!normalizedCode && !normalizedEmail)
      throw new BadRequestException('clinicCode or clinicEmail is required');

    const clinic = await this.repository.findClinicByCodeOrEmail(
      normalizedCode,
      normalizedEmail,
    );

    if (!clinic)
      throw new NotFoundException(
        'No active clinic found for provided details',
      );

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
}
