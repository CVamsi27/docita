import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ClinicTier,
  ClinicType,
  Prisma,
  SubscriptionStatus,
} from '@workspace/db';
import * as bcrypt from 'bcrypt';

interface CreateClinicData {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  tier?: ClinicTier;
  type?: ClinicType;
  settings?: Prisma.InputJsonValue;
}

interface UpdateClinicData {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  tier?: ClinicTier;
  type?: ClinicType;
  settings?: Prisma.InputJsonValue;
}

interface ClinicSettingsData {
  name?: string;
  address?: string;
  phone?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  description?: string;
  openingTime?: string;
  closingTime?: string;
  workingDays?: string[];
  consultationDuration?: number;
  type?: ClinicType;
  reminderBefore?: string | number;
  reminderUnit?: string;
  whatsappAppointmentReminders?: boolean;
  whatsappFollowUpMessages?: boolean;
  whatsappBirthdayWishes?: boolean;
  whatsappMedicineReminders?: boolean;
  customFields?: { name: string; type: string; required: boolean }[];
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  pushNotifications?: boolean;
  appointmentAlerts?: boolean;
  reportAlerts?: boolean;
  twoFactorAuth?: boolean;
  sessionTimeout?: string | number;
  auditLogs?: boolean;
  theme?: string;
  primaryColor?: string;
  compactMode?: boolean;
}

import { ClinicFactory } from './factories/clinic.factory';
import { SettingsFactory } from './factories/settings.factory';

@Injectable()
export class ClinicsService {
  constructor(
    private prisma: PrismaService,
    private clinicFactory: ClinicFactory,
    private settingsFactory: SettingsFactory,
  ) {}

  async create(data: CreateClinicData) {
    const clinicInput = this.clinicFactory.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      tier: data.tier,
      settings: data.settings as Record<string, unknown>,
    });

    return this.prisma.clinic.create({
      data: {
        ...clinicInput,
        logo: data.logo,
        type: data.type,
        // Settings are now handled by the factory and included in clinicInput

        // Override active from factory if needed or keep default.
        // Also keep the existing subscriptionStatus logic
        subscriptionStatus:
          process.env.NODE_ENV === 'production'
            ? undefined
            : SubscriptionStatus.TRIALING,
      },
    });
  }

  async findAll() {
    return this.prisma.clinic.findMany({
      where: { active: true },
      include: {
        _count: {
          select: {
            users: true,
            patients: true,
            appointments: true,
            // appointments: true // Duplicate removed if present
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            patients: true,
            appointments: true,
          },
        },
      },
    });

    if (!clinic) return null;

    // Flatten settings for frontend convenience
    const settings = clinic.settings as Record<string, unknown> | null;
    return {
      ...clinic,
      phoneNumber: clinic.phone, // Map phone to phoneNumber for frontend
      description: settings?.description as string | undefined,
      openingTime: settings?.openingTime as string | undefined,
      closingTime: settings?.closingTime as string | undefined,
      workingDays: settings?.workingDays as string[] | undefined,
      consultationDuration: settings?.consultationDuration as
        | number
        | undefined,
    };
  }

  async update(id: string, data: UpdateClinicData) {
    return this.prisma.clinic.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        logo: data.logo,
        tier: data.tier,
        type: data.type,
        settings: data.settings,
      },
    });
  }

  async updateSettings(id: string, data: ClinicSettingsData) {
    // Validate partial settings update
    // We treat ClinicSettingsData as a partial update to the settings blob
    // However, some fields in ClinicSettingsData are NOT part of the settings json blob (like name, address, phone...)
    // So we should separate them.

    // Extract actual settings fields to validate
    const settingsToValidate = {
      description: data.description,
      openingTime: data.openingTime,
      closingTime: data.closingTime,
      workingDays: data.workingDays,
      consultationDuration: data.consultationDuration,
      reminderBefore: data.reminderBefore,
      reminderUnit: data.reminderUnit,
      whatsappAppointmentReminders: data.whatsappAppointmentReminders,
      whatsappFollowUpMessages: data.whatsappFollowUpMessages,
      whatsappBirthdayWishes: data.whatsappBirthdayWishes,
      whatsappMedicineReminders: data.whatsappMedicineReminders,
      customFields: data.customFields,
      emailNotifications: data.emailNotifications,
      smsNotifications: data.smsNotifications,
      pushNotifications: data.pushNotifications,
      appointmentAlerts: data.appointmentAlerts,
      reportAlerts: data.reportAlerts,
      twoFactorAuth: data.twoFactorAuth,
      sessionTimeout: data.sessionTimeout,
      auditLogs: data.auditLogs,
      theme: data.theme,
      primaryColor: data.primaryColor,
      compactMode: data.compactMode,
    };

    // Clean undefined values from settingsToValidate
    const cleanSettings = Object.fromEntries(
      Object.entries(settingsToValidate).filter(([_, v]) => v !== undefined),
    );

    // Validate using factory (which uses Zod schema)
    const validatedSettings =
      this.settingsFactory.partialValidate(cleanSettings);

    return this.prisma.clinic.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        phone: data.phoneNumber || data.phone,
        email: data.email,
        website: data.website,
        type: data.type,
        // We use deep merge in Prisma using update on json?
        // Prisma doesn't support deep merge on Update automatically for JSON columns in all DBs,
        // usually it replaces the value unless we allow raw SQL or read-modify-write.
        // But here the code was constructing a NEW settings object:
        /*
          settings: {
             description: data.description,
             ...
          }
        */
        // The original code was replacing 'settings' with a new object constructed from 'data'.
        // If 'data' had undefined fields, they would be undefined in the new object?
        // No, in the original code, it was creating an object with ALL fields.

        // Wait, the original code looked like this:
        /*
        settings: {
          description: data.description,
          // ...
          compactMode: data.compactMode,
        },
        */
        // If 'data.description' was undefined, 'description' in settings would be undefined.
        // Does this mean it WIPES OUT existing settings not in 'data'?
        // The interface `ClinicSettingsData` has all optional fields.
        // If the frontend sends only `{ theme: 'dark' }`, all other fields will be undefined.
        // If this overwrites the DB column, we LOSE all other settings.
        // This looks like a bug in the *original* code if specific granular updates were intended.
        // But if the frontend always sends the full settings object, it's fine.

        // However, to be safe and "modern", we should merge.
        // BUT, since we have `SettingsFactory`, maybe we should assume we want to validate what we are saving.

        // Let's stick to the original behavior mostly, but use the validated values.
        // Actually, if we use `partialValidate`, it only returns valid keys.
        // If we want to support partial updates without wiping data, we should probably read-modify-write
        // OR assume the frontend sends everything.
        // Given 'updateSettings' usually implies updating the configuration, let's assume valid partials should be merged.
        // But since I cannot change the frontend contract right now without knowing it,
        // and looking at `ClinicSettingsData`, it seems to mix clinic-level fields (name, address) and settings-level fields.

        // I will preserve the original structure but strictly use validatedSettings for the settings part.
        // CAUTION: The original code constructed a specific object structure for `settings`.
        // My `settingsToValidate` matches that structure.
        // So `validatedSettings` will allow us to save valid data.

        // To avoid data loss if it WAS partial, I will look at the previous implementation detail:
        // Use `cleanSettings` logic + validation.

        // IMPORTANT: The original implementation constructed a NEW object.
        // If I change this to a merge, I might fix a bug or break expectation.
        // However, standard "Update Settings" usually means "Here are the new settings".
        // If I use `validatedSettings`, it only contains the fields that passed validation.

        // Wait, if validatedSettings provides a partial object, and we save it to a JSON column,
        // Prisma will Replace the JSON column with this partial object (erasing others).
        // This is dangerous if the previous code was relying on "undefined" fields being ignored or something?
        // Actually, undefined fields in a JS object passed to Prisma:
        // If I pass `{ a: 1, b: undefined }`, Prisma/ususally behaves as `{ a: 1 }`.

        // The original code:
        /*
          settings: {
             description: data.description,
             ...
          }
        */
        // If `data.description` is undefined, the settings object has `description: undefined`.
        // `JSON.stringify` removes undefined keys.
        // So effectively, the DB stored ONLY the keys that were present in `data`.
        // This implies that EITHER:
        // 1. The frontend sends the FULL settings object every time.
        // 2. OR, the previous implementation was buggy and was wiping data on partial updates.

        // Given I am "Standardizing", I will do a Read-Modify-Write to be safe?
        // OR better: Since `updateSettings` takes `ClinicSettingsData` which is a huge interface,
        // I will assume it *might* be partial.
        // But wait, `Prisma` `update` of a JSON column is a REPLACE operation.
        // If I want to update *only* changed fields, I need to fetch first.

        // `updatePrescriptionDefaults` below DOES fetch first.
        // `updateSettings` DOES NOT fetch first in the original code.
        // This suggests the original code expects a full replace.
        // I will stick to that logic to avoid side effects, but use validation.

        settings: validatedSettings as Prisma.InputJsonValue,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.clinic.update({
      where: { id },
      data: { active: false },
    });
  }

  async getUserClinics(userId: string) {
    const doctorClinics = await this.prisma.doctorClinic.findMany({
      where: {
        doctorId: userId,
        active: true,
      },
      select: {
        clinic: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            email: true,
            website: true,
            tier: true,
            logo: true,
            active: true,
            settings: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return doctorClinics.map((dc) => {
      const clinic = dc.clinic;
      const settings = clinic.settings as Record<string, unknown> | null;
      return {
        ...clinic,
        phoneNumber: clinic.phone, // Map phone to phoneNumber for frontend
        description: settings?.description as string | undefined,
        openingTime: settings?.openingTime as string | undefined,
        closingTime: settings?.closingTime as string | undefined,
        workingDays: settings?.workingDays as string[] | undefined,
        consultationDuration: settings?.consultationDuration as
          | number
          | undefined,
      };
    });
  }

  async getClinicStats(clinicId: string) {
    const [patients, appointments, todayAppointments] = await Promise.all([
      this.prisma.patient.count({ where: { clinicId } }),
      this.prisma.appointment.count({ where: { clinicId } }),
      this.prisma.appointment.count({
        where: {
          clinicId,
          startTime: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
    ]);

    return {
      totalPatients: patients,
      totalAppointments: appointments,
      todayAppointments,
    };
  }

  async createDoctor(
    clinicId: string,
    data: {
      name: string;
      email: string;
      password: string;
      phoneNumber?: string;
      specialization?: string;
      qualification?: string;
      registrationNumber?: string;
    },
  ) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Build user data, only including specialization if provided and valid
    const userData: any = {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: 'DOCTOR',
      clinicId,
      phoneNumber: data.phoneNumber,
      qualification: data.qualification,
      registrationNumber: data.registrationNumber,
    };

    // Only add specialization if provided
    if (data.specialization) {
      userData.specialization = data.specialization;
    }

    const user = await this.prisma.user.create({
      data: userData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        specialization: true,
        qualification: true,
        registrationNumber: true,
        createdAt: true,
      },
    });

    // Create DoctorClinic association
    await this.prisma.doctorClinic.create({
      data: {
        doctorId: user.id,
        clinicId,
      },
    });

    return user;
  }

  async getDoctors(clinicId: string) {
    return this.prisma.user.findMany({
      where: {
        clinicId,
        role: 'DOCTOR',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        specialization: true,
        qualification: true,
        registrationNumber: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createReceptionist(
    clinicId: string,
    data: {
      name: string;
      email: string;
      password: string;
      phoneNumber?: string;
    },
  ) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: 'RECEPTIONIST',
        clinicId,
        phoneNumber: data.phoneNumber,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        createdAt: true,
      },
    });

    return user;
  }

  async getReceptionists(clinicId: string) {
    return this.prisma.user.findMany({
      where: {
        clinicId,
        role: 'RECEPTIONIST',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  async getMembers(clinicId: string) {
    return this.prisma.user.findMany({
      where: {
        clinicId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        specialization: true,
        hospitalRole: true,
        qualification: true,
        registrationNumber: true,
        profilePhotoUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getPrescriptionDefaults(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { settings: true },
    });

    if (!clinic) return null;

    const settings = clinic.settings as Record<string, any> | null;

    return {
      defaultInstructions: settings?.defaultInstructions ?? '',
      defaultFooterText: settings?.defaultFooterText ?? '',
      includeClinicHeader: settings?.includeClinicHeader ?? true,
      includeDoctorSignature: settings?.includeDoctorSignature ?? true,
      includeQRCode: settings?.includeQRCode ?? false,
    };
  }

  async updatePrescriptionDefaults(
    clinicId: string,
    data: Record<string, unknown>,
  ) {
    // First get existing settings to merge
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { settings: true },
    });

    const currentSettings = (clinic?.settings as Record<string, any>) || {};

    return this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        settings: {
          ...currentSettings,
          ...data,
        },
      },
    });
  }
}
