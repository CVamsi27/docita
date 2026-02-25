/**
 * Prisma Appointment Repository
 * Implementation of IAppointmentRepository using Prisma
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  IAppointmentRepository,
  AppointmentSearchParams,
  PaginatedResult,
} from '../../core/repositories/appointment.repository.interface';
import { Appointment } from '../../core/entities/appointment.entity';
import { AppointmentMapper } from '../mappers/appointment.mapper';
import { AppointmentStatusEnum } from '../../core/value-objects/appointment-status.value-object';
import { Prisma, Appointment as PrismaAppointment } from '@workspace/db';

@Injectable()
export class PrismaAppointmentRepository implements IAppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    params: AppointmentSearchParams,
  ): Promise<PaginatedResult<Appointment>> {
    const {
      clinicId,
      startDate,
      endDate,
      patientId,
      doctorId,
      status,
      search,
      cursor,
      limit = 20,
    } = params;

    const where: Prisma.AppointmentWhereInput = {
      clinicId,
    };

    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (status && status.length > 0) {
      where.status = { in: status as any };
    }

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = startDate;
      if (endDate) where.startTime.lte = endDate;
    }

    if (search) {
      where.OR = [
        { patient: { firstName: { contains: search, mode: 'insensitive' } } },
        { patient: { lastName: { contains: search, mode: 'insensitive' } } },
        { patient: { phoneNumber: { contains: search } } },
      ];
    }

    try {
      const [total, items] = await Promise.all([
        this.prisma.appointment.count({ where }),
        this.prisma.appointment.findMany({
          where,
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          orderBy: { startTime: 'asc' },
        }),
      ]);

      const hasMore = items.length > limit;
      const resultItems = hasMore ? items.slice(0, limit) : items;
      const nextCursor = hasMore
        ? resultItems[resultItems.length - 1].id
        : undefined;

      return {
        items: resultItems.map((item) => AppointmentMapper.toDomain(item)),
        nextCursor,
        hasMore,
        count: total,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to find appointments: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findById(id: string): Promise<Appointment | null> {
    const item = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!item) return null;
    return AppointmentMapper.toDomain(item);
  }

  async save(appointment: Appointment): Promise<void> {
    const data = AppointmentMapper.toPersistence(appointment);

    await this.prisma.appointment.create({
      data: data,
    });
  }

  async update(appointment: Appointment): Promise<void> {
    const data = AppointmentMapper.toPersistence(appointment);
    const { id, ...updateData } = data;

    await this.prisma.appointment.update({
      where: { id },
      data: {
        ...updateData,
        version: { increment: 1 },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.appointment.delete({
      where: { id },
    });
  }

  async findByPatientId(patientId: string): Promise<Appointment[]> {
    const items = await this.prisma.appointment.findMany({
      where: { patientId },
      orderBy: { startTime: 'desc' },
    });

    return items.map((item) => AppointmentMapper.toDomain(item));
  }

  async findByDoctorId(doctorId: string, date: Date): Promise<Appointment[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const items = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return items.map((item) => AppointmentMapper.toDomain(item));
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.appointment.count({
      where: { id },
    });
    return count > 0;
  }
}
