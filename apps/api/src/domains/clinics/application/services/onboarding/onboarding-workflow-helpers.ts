/** Pure transaction-level helpers for onboarding workflow — no DI, no @Injectable. */
import { BadRequestException } from '@nestjs/common';
import { Prisma, Role, Specialization } from '@workspace/db';
import { isFrontDeskTier } from '@workspace/types';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { generateReferralCode, toStaffRole } from './onboarding-step-engine';
import {
  StaffSetupDto,
  ClinicTier,
} from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';

interface ValidationDeps {
  validatePasswordStrength(p: string): { valid: boolean; error?: string };
  validateSpecialization(s: string | null | undefined): Specialization | null;
}

/** Retries referral code generation until it finds a unique one. */
export async function generateUniqueReferralCodeInTx(
  tx: Prisma.TransactionClient,
  clinicName: string,
): Promise<string> {
  let attempts = 0;
  let referralCode = generateReferralCode(clinicName);

  while (attempts < 8) {
    const existing = await tx.clinic.findFirst({
      where: { referralCode },
      select: { id: true },
    });
    if (!existing) return referralCode;
    attempts += 1;
    referralCode = generateReferralCode(clinicName);
  }

  throw new BadRequestException('Unable to generate a unique clinic code');
}

/** Creates staff members inside a transaction; returns count of created users. */
export async function createStaffMembersInTx(
  tx: Prisma.TransactionClient,
  clinicId: string,
  staffData: StaffSetupDto,
  validation: ValidationDeps,
  ipAddress?: string,
  planTier?: ClinicTier,
): Promise<number> {
  if (!staffData.staffMembers?.length) return 0;

  let count = 0;
  for (const member of staffData.staffMembers) {
    const existing = await tx.user.findUnique({
      where: { email: member.email },
    });
    if (existing) continue;

    const passwordValidation = validation.validatePasswordStrength(
      member.password,
    );
    if (!passwordValidation.valid) continue;

    const hashedPassword = await bcrypt.hash(member.password, 10);
    const prismaRole = toStaffRole(member.role);
    const anchorDoctorOnFrontDeskTier =
      isFrontDeskTier(planTier) && prismaRole === Role.DOCTOR;

    const newUser = await tx.user.create({
      data: {
        name: member.name,
        email: member.email,
        password: hashedPassword,
        phoneNumber: member.phoneNumber,
        role: prismaRole,
        clinicId,
        qualification: member.qualification,
        registrationNumber: member.registrationNumber,
        specialization: validation.validateSpecialization(
          member.specialization,
        ),
        ...(anchorDoctorOnFrontDeskTier ? { appLoginDisabled: true } : {}),
      },
    });

    await tx.auditLog.create({
      data: {
        userId: newUser.id,
        clinicId,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: newUser.id,
        metadata: {
          role: member.role,
          createdDuringOnboarding: true,
          ipAddress,
        },
      },
    });

    count++;
  }

  return count;
}

/** Creates a schedule-anchor doctor for front-desk clinics that have no doctors yet. */
export async function ensureFrontDeskScheduleDoctorInTx(
  tx: Prisma.TransactionClient,
  clinicId: string,
): Promise<void> {
  const doctorCount = await tx.user.count({
    where: { clinicId, role: Role.DOCTOR },
  });
  if (doctorCount > 0) return;

  const token = randomBytes(12).toString('hex');
  const email = `schedule-${clinicId}-${token}@placeholders.docita.invalid`;
  const hashedPassword = await bcrypt.hash(randomBytes(32).toString('hex'), 10);

  const user = await tx.user.create({
    data: {
      name: 'Clinic schedule',
      email,
      password: hashedPassword,
      role: Role.DOCTOR,
      clinicId,
      appLoginDisabled: true,
    },
  });

  await tx.doctorClinic.create({ data: { doctorId: user.id, clinicId } });
}
