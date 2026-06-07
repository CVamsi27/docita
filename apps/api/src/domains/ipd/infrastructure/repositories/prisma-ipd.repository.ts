import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { AdmissionStatus, BedStatus, Role } from '@workspace/db';
import { parseStringEnumMember } from '@workspace/utils';
import type {
  Admission,
  AdmitPatientRequest,
  DischargePatientRequest,
  TransferPatientRequest,
} from '@workspace/types';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IpdRepository,
  WardWithRooms,
} from '@/domains/ipd/core/repositories/ipd.repository.interface';

@Injectable()
export class PrismaIpdRepository implements IpdRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  listWards(clinicId: string, search?: string): Promise<WardWithRooms[]> {
    const trimmedSearch = search?.trim();
    return this.prisma.ward.findMany({
      where: {
        clinicId,
        ...(trimmedSearch
          ? {
              OR: [
                { name: { contains: trimmedSearch, mode: 'insensitive' } },
                { type: { contains: trimmedSearch, mode: 'insensitive' } },
                {
                  rooms: {
                    some: {
                      OR: [
                        {
                          roomNumber: {
                            contains: trimmedSearch,
                            mode: 'insensitive',
                          },
                        },
                        {
                          beds: {
                            some: {
                              bedNumber: {
                                contains: trimmedSearch,
                                mode: 'insensitive',
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        rooms: {
          orderBy: { roomNumber: 'asc' },
          include: {
            beds: { orderBy: { bedNumber: 'asc' } },
          },
        },
      },
      orderBy: [{ floorNumber: 'asc' }, { name: 'asc' }],
    });
  }

  listAdmissions(clinicId: string, status?: string): Promise<Admission[]> {
    const parsedStatus = status
      ? parseStringEnumMember(Object.values(AdmissionStatus), status)
      : undefined;

    return this.prisma.admission.findMany({
      where: {
        bed: { room: { ward: { clinicId } } },
        ...(parsedStatus ? { status: parsedStatus } : {}),
      },
      orderBy: { admittedAt: 'desc' },
    });
  }

  async admitPatient(
    clinicId: string,
    input: AdmitPatientRequest,
  ): Promise<Admission> {
    const [bed, patient, doctor] = await Promise.all([
      this.prisma.bed.findFirst({
        where: { id: input.bedId, room: { ward: { clinicId } } },
      }),
      this.prisma.patient.findFirst({
        where: { id: input.patientId, clinicId, deletedAt: null },
        select: { id: true },
      }),
      this.findClinicalStaff(clinicId, input.admittingDoctorId),
    ]);

    if (!patient)
      throw new NotFoundException('Patient was not found in this facility');
    if (!doctor)
      throw new NotFoundException('Attending clinician was not found');
    if (!bed) throw new NotFoundException('Bed was not found in this facility');
    if (bed.status !== BedStatus.AVAILABLE)
      throw new ConflictException('Selected bed is not available');

    return this.prisma.$transaction(async (tx) => {
      const activeAdmission = await tx.admission.findFirst({
        where: {
          patientId: input.patientId,
          status: AdmissionStatus.ADMITTED,
          bed: { room: { ward: { clinicId } } },
        },
        select: { id: true },
      });

      if (activeAdmission)
        throw new ConflictException('Patient already has an active admission');
      const admission = await tx.admission.create({
        data: {
          patientId: input.patientId,
          bedId: input.bedId,
          admittedAt: input.admissionDate
            ? new Date(input.admissionDate)
            : undefined,
          reason: input.admissionReason,
          diagnosis: input.diagnosis,
          notes: input.notes,
          admittingDoctorId: input.admittingDoctorId,
        },
      });

      await tx.bed.update({
        where: { id: input.bedId },
        data: { status: BedStatus.OCCUPIED },
      });

      return admission;
    });
  }

  async transferPatient(
    clinicId: string,
    input: TransferPatientRequest,
  ): Promise<Admission> {
    const [admission, targetBed] = await Promise.all([
      this.findAdmissionForClinic(clinicId, input.admissionId),
      this.prisma.bed.findFirst({
        where: { id: input.toBedId, room: { ward: { clinicId } } },
      }),
    ]);

    if (!admission)
      throw new NotFoundException('Admission was not found in this facility');
    if (admission.status !== AdmissionStatus.ADMITTED)
      throw new BadRequestException(
        'Only active admissions can be transferred',
      );
    if (!targetBed)
      throw new NotFoundException('Target bed was not found in this facility');
    if (targetBed.status !== BedStatus.AVAILABLE)
      throw new ConflictException('Target bed is not available');
    if (admission.bedId === input.toBedId)
      throw new BadRequestException('Patient is already assigned to this bed');

    return this.prisma.$transaction(async (tx) => {
      await tx.bed.update({
        where: { id: admission.bedId },
        data: { status: BedStatus.AVAILABLE },
      });
      await tx.bed.update({
        where: { id: input.toBedId },
        data: { status: BedStatus.OCCUPIED },
      });

      const transferNote = [
        admission.notes,
        `Transferred to bed ${targetBed.bedNumber}${
          input.reason ? `: ${input.reason}` : ''
        }`,
      ]
        .filter(Boolean)
        .join('\n');

      return tx.admission.update({
        where: { id: admission.id },
        data: {
          bedId: input.toBedId,
          notes: transferNote,
        },
      });
    });
  }

  async dischargePatient(
    clinicId: string,
    input: DischargePatientRequest,
  ): Promise<Admission> {
    const admission = await this.findAdmissionForClinic(
      clinicId,
      input.admissionId,
    );
    if (!admission)
      throw new NotFoundException('Admission was not found in this facility');
    if (admission.status !== AdmissionStatus.ADMITTED)
      throw new BadRequestException('Only active admissions can be discharged');

    return this.prisma.$transaction(async (tx) => {
      const dischargeNotes = [
        admission.notes,
        input.dischargeSummary
          ? `Discharge summary: ${input.dischargeSummary}`
          : undefined,
        input.dischargeInstructions
          ? `Discharge instructions: ${input.dischargeInstructions}`
          : undefined,
      ]
        .filter(Boolean)
        .join('\n');

      const discharged = await tx.admission.update({
        where: { id: admission.id },
        data: {
          status: AdmissionStatus.DISCHARGED,
          dischargedAt: input.dischargeDate
            ? new Date(input.dischargeDate)
            : this.clock.now(),
          notes: dischargeNotes,
        },
      });

      await tx.bed.update({
        where: { id: admission.bedId },
        data: { status: BedStatus.AVAILABLE },
      });

      return discharged;
    });
  }

  private findAdmissionForClinic(clinicId: string, admissionId: string) {
    return this.prisma.admission.findFirst({
      where: {
        id: admissionId,
        bed: { room: { ward: { clinicId } } },
      },
    });
  }

  private findClinicalStaff(clinicId: string, userId: string) {
    return this.prisma.user.findFirst({
      where: {
        id: userId,
// jscpd:ignore-start
        role: { in: [Role.DOCTOR, Role.ADMIN_DOCTOR, Role.NURSE] },
        OR: [
          { clinicId },
          {
            doctorClinics: {
              some: {
                clinicId,
                active: true,
              },
            },
          },
        ],
      },
      select: { id: true },
// jscpd:ignore-end
    });
  }
}
