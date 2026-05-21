import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  AppointmentStatus,
  ConsentStatus,
  ConsentType,
  Gender,
  InvoiceStatus,
} from '@workspace/db';
import type { OcrImportCommitRequest } from '@workspace/types';
import { parseStringEnumMember } from '@workspace/utils';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import type { ImportAuditContext } from './import-types';

@Injectable()
export class OcrImportCommitService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async commitOcrImport(
    dto: OcrImportCommitRequest,
    audit: ImportAuditContext,
  ): Promise<{ patientId: string; appointmentId: string }> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: dto.clinicId },
      select: { id: true },
    });
    if (!clinic) {
      throw new BadRequestException('Clinic not found');
    }

    const doctor = await this.prisma.user.findFirst({
      where: { id: dto.doctorId, clinicId: dto.clinicId },
      select: { id: true },
    });
    if (!doctor) {
      throw new BadRequestException('Doctor not found for this clinic');
    }

    const dob = new Date(dto.dateOfBirth);
    if (Number.isNaN(dob.getTime())) {
      throw new BadRequestException('Invalid dateOfBirth');
    }

    if (!dto.dpdpConsent || dto.dpdpConsent.accepted !== true) {
      throw new BadRequestException(
        'DPDP consent is required to commit an OCR-extracted patient record',
      );
    }
    if (!audit.dpdpNoticeVersion) {
      throw new BadRequestException(
        'Missing DPDP consent context for OCR commit',
      );
    }
    if (dto.dpdpConsent.noticeVersion !== audit.dpdpNoticeVersion) {
      throw new BadRequestException(
        'The DPDP notice has been updated. Refresh and re-collect consent before committing.',
      );
    }
    const consentSnapshot = dto.dpdpConsent;

    return this.prisma.$transaction(async (tx) => {
      const patient = await tx.patient.create({
        data: {
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          phoneNumber: dto.phoneNumber.trim(),
          gender:
            parseStringEnumMember(Object.values(Gender), dto.gender) ??
            Gender.OTHER,
          dateOfBirth: dob,
          address: dto.address?.trim() || undefined,
          clinicId: dto.clinicId,
          allergies:
            dto.allergies && dto.allergies.length > 0
              ? dto.allergies.join('; ')
              : undefined,
          medicalHistory: dto.diagnosis ? [dto.diagnosis] : [],
          customData: {
            ocrImport: {
              acknowledgedReview: dto.acknowledgeReview ?? false,
            },
          },
        },
      });
      await tx.consent.create({
        data: {
          patientId: patient.id,
          clinicId: dto.clinicId,
          consentType: ConsentType.DPDP_NOTICE,
          status: ConsentStatus.ACTIVE,
          givenBy:
            consentSnapshot.givenByName ??
            `${dto.firstName} ${dto.lastName}`.trim(),
          givenByRelation: consentSnapshot.relation ?? 'SELF',
          givenAt: this.clock.now(),
          validFrom: this.clock.now(),
          templateVersion: consentSnapshot.noticeVersion,
          ipAddress: audit.ipAddress,
          userAgent: audit.userAgent,
          createdBy: audit.createdBy,
          notes: 'Collected by staff via OCR import commit',
        },
      });

      const startTime = this.clock.now();
      const endTime = new Date(this.clock.now().getTime() + 30 * 60 * 1000);

      const appointment = await tx.appointment.create({
        data: {
          patientId: patient.id,
          doctorId: dto.doctorId,
          clinicId: dto.clinicId,
          startTime,
          endTime,
          type: 'consultation',
          status: AppointmentStatus.CONFIRMED,
          consultationNotes: dto.consultationNotes?.trim() ?? '',
          notes: '',
          observations: dto.diagnosis?.trim() ?? '',
          provisionalDiagnosis: '',
          differentialDiagnosis: '',
          clinicalImpression: '',
          finalDiagnosis: '',
          treatmentPlan: '',
          followUpPlan: '',
        },
      });

      if (dto.vitals) {
        const v = dto.vitals;
        if (
          v.systolicBP !== undefined ||
          v.diastolicBP !== undefined ||
          v.temperature !== undefined ||
          v.pulse !== undefined
        ) {
          await tx.vitalSign.create({
            data: {
              appointmentId: appointment.id,
              systolicBP: v.systolicBP,
              diastolicBP: v.diastolicBP,
              temperature: v.temperature,
              pulse: v.pulse,
            },
          });
        }
      }

      if (dto.medications && dto.medications.length > 0) {
        const prescription = await tx.prescription.create({
          data: {
            appointmentId: appointment.id,
            patientId: patient.id,
            doctorId: dto.doctorId,
            instructions: dto.consultationNotes?.trim() ?? null,
          },
        });

        for (const med of dto.medications) {
          await tx.medication.create({
            data: {
              prescriptionId: prescription.id,
              name: med.name.trim(),
              dosage: med.dosage.trim() || '—',
              frequency: med.frequency.trim() || '—',
              duration: med.duration?.trim() || '—',
              route: med.route?.trim() || 'PO',
            },
          });
        }
      }

      if (dto.invoiceDraft) {
        const inv = dto.invoiceDraft;
        await tx.invoice.create({
          data: {
            patientId: patient.id,
            appointmentId: appointment.id,
            clinicId: dto.clinicId,
            total: inv.grandTotal,
            subtotal: inv.subtotal ?? inv.grandTotal,
            grandTotal: inv.grandTotal,
            taxTotal: inv.taxTotal ?? 0,
            discountTotal: 0,
            status: InvoiceStatus.PENDING,
            items: toPrismaInputJsonValue(inv.items),
          },
        });
      }

      return {
        patientId: patient.id,
        appointmentId: appointment.id,
      };
    });
  }
}
