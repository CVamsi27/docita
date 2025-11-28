import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Appointment } from '@workspace/types';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Appointment[]> {
    const appointments = await this.prisma.appointment.findMany({
      orderBy: { startTime: 'desc' },
      include: { patient: true },
    });
    return appointments as unknown as Appointment[];
  }

  async findOne(id: string): Promise<Appointment> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { patient: true },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    return appointment as unknown as Appointment;
  }

  async create(
    data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Appointment> {
    const { doctor, vitalSign, prescription, invoice, ...rest } = data;

    const appointment = await this.prisma.appointment.create({
      data: {
        ...rest,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        // clinicId is included in rest spread
      } as any, // Type assertion to allow clinicId
      include: { patient: true },
    });
    return appointment as unknown as Appointment;
  }

  async update(
    id: string,
    data: Partial<Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Appointment> {
    const { doctor, vitalSign, prescription, invoice, ...rest } = data;
    const appointment = await this.prisma.appointment.update({
      where: { id },
      data: {
        ...rest,
        ...(data.startTime && { startTime: new Date(data.startTime) }),
        ...(data.endTime && { endTime: new Date(data.endTime) }),
      },
      include: { patient: true },
    });
    return appointment as unknown as Appointment;
  }

  async remove(id: string): Promise<void> {
    await this.prisma.appointment.delete({
      where: { id },
    });
  }

  async createVitals(
    appointmentId: string,
    data: {
      height?: number;
      weight?: number;
      bloodPressure?: string;
      pulse?: number;
      temperature?: number;
      spo2?: number;
    },
  ) {
    return this.prisma.vitalSign.create({
      data: {
        appointmentId,
        ...data,
      },
    });
  }
}
