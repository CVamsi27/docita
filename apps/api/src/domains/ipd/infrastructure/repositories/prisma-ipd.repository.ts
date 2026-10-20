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
import { withBlockingAdvisoryLock } from '@/shared/common/utils/postgres-advisory-lock';
import {
  IpdRepository,
  WardWithRooms,
} from '@/domains/ipd/core/repositories/ipd.repository.interface';

/**
 * A patient occupies at most one bed. The bed claim is a single-winner
 * conditional UPDATE, but "does this patient already have a live admission"
 * is a read, and a read plus an insert in one transaction is still two
 * statements under READ COMMITTED: parallel admissions of the same patient each
 * saw "no active admission" and each inserted one, putting a single patient in
 * several beds at once. Serialising the check-and-insert on the patient makes
 * the read-then-write atomic; a later admission waits for the first to commit
 * and then sees it. Admissions for different patients never contend.
 */
function activeAdmissionLockName(patientId: string): string {
  return `ipd:active-admission:${patientId}`;
}

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

    return withBlockingAdvisoryLock(
      this.prisma,
      activeAdmissionLockName(input.patientId),
      async (tx) => {
        const activeAdmission = await tx.admission.findFirst({
          where: {
            patientId: input.patientId,
            status: AdmissionStatus.ADMITTED,
            bed: { room: { ward: { clinicId } } },
          },
          select: { id: true },
        });

        if (activeAdmission)
          throw new ConflictException(
            'Patient already has an active admission',
          );

        // Claim the bed conditionally. The availability read above happened
        // outside this transaction, so under READ COMMITTED two parallel
        // admissions could both see AVAILABLE and both insert — putting two
        // patients in one bed. This conditional UPDATE is the single-winner
        // guarantee: only the caller that flips AVAILABLE -> OCCUPIED proceeds.
        const claimed = await tx.bed.updateMany({
          where: { id: input.bedId, status: BedStatus.AVAILABLE },
          data: { status: BedStatus.OCCUPIED },
        });
        if (claimed.count !== 1)
          throw new ConflictException('Selected bed is not available');

        return tx.admission.create({
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
      },
    );
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
      // Claim the target bed before releasing the source. Releasing first
      // would let a concurrent admission take the bed this patient is still
      // recorded in, and an unconditional target update let two parallel
      // transfers both claim the same bed.
      const claimedTarget = await tx.bed.updateMany({
        where: { id: input.toBedId, status: BedStatus.AVAILABLE },
        data: { status: BedStatus.OCCUPIED },
      });
      if (claimedTarget.count !== 1)
        throw new ConflictException('Target bed is not available');

      await tx.bed.updateMany({
        where: { id: admission.bedId, status: BedStatus.OCCUPIED },
        data: { status: BedStatus.AVAILABLE },
      });

      const transferNote = [
        admission.notes,
        `Transferred to bed ${targetBed.bedNumber}${
          input.reason ? `: ${input.reason}` : ''
        }`,
      ]
        .filter(Boolean)
        .join('\n');

      // Ownership-aware: an admission may move only while it is still ADMITTED
      // *and* still in the bed this call was decided against. Status alone is
      // not enough — two transfers out of the same bed both pass a status gate,
      // and the second would silently overwrite the first move and strand the
      // first target bed as occupied by nobody.
      const moved = await tx.admission.updateMany({
        where: {
          id: admission.id,
          status: AdmissionStatus.ADMITTED,
          bedId: admission.bedId,
        },
        data: {
          bedId: input.toBedId,
          notes: transferNote,
        },
      });
      if (moved.count !== 1)
        throw new ConflictException(
          'Admission is no longer active in that bed; reload it before retrying',
        );

      return tx.admission.findUniqueOrThrow({ where: { id: admission.id } });
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

      // Ownership-aware: a repeated discharge (double submit, retried request)
      // must not rewrite a discharge that already happened, and a discharge
      // decided against a bed the patient has since left must not free the bed
      // that a new admission has moved into. Gating on `bedId` as well as
      // `status` makes the freed bed provably the one this admission held.
      const discharged = await tx.admission.updateMany({
        where: {
          id: admission.id,
          status: AdmissionStatus.ADMITTED,
          bedId: admission.bedId,
        },
        data: {
          status: AdmissionStatus.DISCHARGED,
          dischargedAt: input.dischargeDate
            ? new Date(input.dischargeDate)
            : this.clock.now(),
          notes: dischargeNotes,
        },
      });
      if (discharged.count !== 1)
        throw new ConflictException(
          'Admission is no longer active in that bed; reload it before retrying',
        );

      await tx.bed.updateMany({
        where: { id: admission.bedId, status: BedStatus.OCCUPIED },
        data: { status: BedStatus.AVAILABLE },
      });

      return tx.admission.findUniqueOrThrow({ where: { id: admission.id } });
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
