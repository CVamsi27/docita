import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { IDuplicateDetector } from './ports/duplicate-detector.port';
import type { DuplicateCheckResult, MappedPatientData } from './import-types';
import {
  cleanImportName,
  formatImportDateMedium,
  normalizeImportPhoneNumber,
  parseImportDate,
} from './import-row-normalizer';

@Injectable()
export class ImportDuplicateDetectorService implements IDuplicateDetector {
  constructor(private readonly prisma: PrismaService) {}

  async checkForDuplicates(
    data: MappedPatientData,
    clinicId?: string,
  ): Promise<DuplicateCheckResult> {
    const phone = normalizeImportPhoneNumber(
      data['phoneNumber'] || data['Phone Number'] || data['phone'],
    );
    const firstName = cleanImportName(
      data['firstName'] || data['First Name'] || data['name'] || '',
    );
    const lastName = cleanImportName(
      data['lastName'] || data['Last Name'] || '',
    );

    if (phone) {
      const existingByPhone = await this.prisma.patient.findFirst({
        where: {
          phoneNumber: phone,
          ...(clinicId && { clinicId }),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
        },
      });

      if (existingByPhone) {
        return {
          isDuplicate: true,
          reason: `Phone number ${phone} already exists`,
          existingPatient: {
            id: existingByPhone.id,
            name: `${existingByPhone.firstName} ${existingByPhone.lastName}`,
            phone: existingByPhone.phoneNumber,
          },
        };
      }
    }

    const dobStr = data['dateOfBirth'] || data['Date of Birth'] || data['dob'];
    if (firstName && dobStr) {
      const dob = parseImportDate(dobStr);
      if (dob) {
        const existingByNameDob = await this.prisma.patient.findFirst({
          where: {
            firstName: { equals: firstName, mode: 'insensitive' },
            ...(lastName && {
              lastName: { equals: lastName, mode: 'insensitive' },
            }),
            dateOfBirth: dob,
            ...(clinicId && { clinicId }),
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        });

        if (existingByNameDob) {
          return {
            isDuplicate: true,
            reason: `Patient ${firstName} ${lastName} with DOB ${formatImportDateMedium(dob)} already exists`,
            existingPatient: {
              id: existingByNameDob.id,
              name: `${existingByNameDob.firstName} ${existingByNameDob.lastName}`,
              phone: existingByNameDob.phoneNumber,
            },
          };
        }
      }
    }

    return { isDuplicate: false, reason: '' };
  }
}
