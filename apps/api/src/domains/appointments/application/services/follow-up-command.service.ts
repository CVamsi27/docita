import {
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import {
  IFollowUpRepository,
  FOLLOW_UP_REPOSITORY_TOKEN,
} from '@/domains/appointments/core/repositories/follow-up.repository.interface';
@Injectable()
export class FollowUpCommandService {
  constructor(
    @Inject(FOLLOW_UP_REPOSITORY_TOKEN)
    private readonly followUpRepository: IFollowUpRepository,
  ) {}

  async create(data: {
    appointmentId: string;
    patientId: string;
    doctorId: string;
    clinicId: string;
    scheduledDate: string;
    reason: string;
  }) {
    return this.followUpRepository.create({
      appointmentId: data.appointmentId,
      patientId: data.patientId,
      doctorId: data.doctorId,
      clinicId: data.clinicId,
      scheduledDate: new Date(data.scheduledDate),
      reason: data.reason,
    });
  }

  async book(id: string, clinicId: string, bookedAppointmentId: string) {
    const followUp = await this.followUpRepository.findByIdAndClinic(
      id,
      clinicId,
    );
    if (!followUp) throw new NotFoundException('Follow-up not found');

    return this.followUpRepository.update(id, {
      status: 'BOOKED',
      bookedAppointmentId,
    });
  }

  async complete(id: string, clinicId: string) {
    const followUp = await this.followUpRepository.findByIdAndClinic(
      id,
      clinicId,
    );
    if (!followUp) throw new NotFoundException('Follow-up not found');
    return this.followUpRepository.update(id, { status: 'COMPLETED' });
  }

  async cancel(id: string, clinicId: string) {
    const followUp = await this.followUpRepository.findByIdAndClinic(
      id,
      clinicId,
    );
    if (!followUp) throw new NotFoundException('Follow-up not found');
    return this.followUpRepository.update(id, { status: 'CANCELLED' });
  }
}
