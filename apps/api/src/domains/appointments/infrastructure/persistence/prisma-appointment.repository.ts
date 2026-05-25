import { Injectable } from '@nestjs/common';
import { IAppointmentRepository } from '@/domains/appointments/core/repositories/appointment.repository.interface';
import type {
  AppointmentListItem,
  AppointmentSearchParams,
  PaginatedResult,
} from '@/domains/appointments/core/repositories/appointment-repository.types';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import { AppointmentStatusEnum } from '@/domains/appointments/core/value-objects/appointment-status.value-object';
import type { Prisma } from '@workspace/db';
import { PrismaAppointmentReadRepository } from './prisma-appointment-read.repository';
import { PrismaAppointmentWriteRepository } from './prisma-appointment-write.repository';

@Injectable()
export class PrismaAppointmentRepository implements IAppointmentRepository {
  constructor(
    private readonly readRepository: PrismaAppointmentReadRepository,
    private readonly writeRepository: PrismaAppointmentWriteRepository,
  ) {}

  findAll(
    params: AppointmentSearchParams,
  ): Promise<PaginatedResult<AppointmentListItem>> {
    return this.readRepository.findAll(params);
  }

  findById(id: string, clinicId: string): Promise<Appointment | null> {
    return this.readRepository.findById(id, clinicId);
  }

  findByPatientId(patientId: string, clinicId: string): Promise<Appointment[]> {
    return this.readRepository.findByPatientId(patientId, clinicId);
  }

  findByDoctorId(
    doctorId: string,
    date: Date,
    clinicId: string,
  ): Promise<Appointment[]> {
    return this.readRepository.findByDoctorId(doctorId, date, clinicId);
  }

  exists(id: string, clinicId: string): Promise<boolean> {
    return this.readRepository.exists(id, clinicId);
  }

  findAppointmentsForSlots(
    clinicId: string,
    doctorIds: string[],
    rangeStart: Date,
    rangeEndExclusive: Date,
  ) {
    return this.readRepository.findAppointmentsForSlots(
      clinicId,
      doctorIds,
      rangeStart,
      rangeEndExclusive,
    );
  }

  findClinicTier(clinicId: string) {
    return this.readRepository.findClinicTier(clinicId);
  }

  findForConsultationStart(id: string, clinicId: string) {
    return this.readRepository.findForConsultationStart(id, clinicId);
  }

  findForUpdate(id: string, clinicId: string) {
    return this.readRepository.findForUpdate(id, clinicId);
  }

  save(appointment: Appointment): Promise<void> {
    return this.writeRepository.save(appointment);
  }

  update(appointment: Appointment): Promise<void> {
    return this.writeRepository.update(appointment);
  }

  delete(id: string, clinicId: string): Promise<void> {
    return this.writeRepository.delete(id, clinicId);
  }

  startConsultationTx(
    id: string,
    clinicId: string,
    queueToken: {
      id: string;
      calledAt: Date | null;
      consultationStart: Date | null;
    } | null,
    currentStatus: AppointmentStatusEnum,
  ): Promise<void> {
    return this.writeRepository.startConsultationTx(
      id,
      clinicId,
      queueToken,
      currentStatus,
    );
  }

  applyPatch(
    id: string,
    clinicId: string,
    patch: Prisma.AppointmentUpdateInput,
  ): Promise<number> {
    return this.writeRepository.applyPatch(id, clinicId, patch);
  }
}
