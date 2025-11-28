/* eslint-disable */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Patient } from '@workspace/types';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) { }

  async findAll(): Promise<Patient[]> {
    const patients = await this.prisma.patient.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return patients as unknown as Patient[];
  }

  async findOne(id: string): Promise<Patient> {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    return patient as unknown as Patient;
  }

  async create(createPatientDto: any) {
    return this.prisma.patient.create({
      data: {
        firstName: createPatientDto.firstName,
        lastName: createPatientDto.lastName,
        phoneNumber: createPatientDto.phoneNumber,
        email: createPatientDto.email,
        address: createPatientDto.address,
        gender: createPatientDto.gender,
        dateOfBirth: createPatientDto.dateOfBirth,
        bloodGroup: createPatientDto.bloodGroup,
        allergies: createPatientDto.allergies,
        medicalHistory: createPatientDto.medicalHistory || [],
        clinicId: createPatientDto.clinicId, // Required for multi-clinic support
        tags: createPatientDto.tags
          ? {
            create: createPatientDto.tags.map((tag: any) => ({
              tag: tag.tag,
              color: tag.color,
            })),
          }
          : undefined,
      },
      include: {
        tags: true,
      },
    });
  }

  async update(
    id: string,
    data: Partial<Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Patient> {
    const { tags, ...rest } = data;
    const patient = await this.prisma.patient.update({
      where: { id },
      data: {
        ...rest,
        ...(rest.gender && { gender: rest.gender.toUpperCase() as any }),
        ...(rest.dateOfBirth && { dateOfBirth: new Date(rest.dateOfBirth) }),
        // For update, we'll just create new tags if provided, or ignore for now to avoid complex diffing
        // In a real app, we'd likely have a separate endpoint for managing tags
      },
    });
    return patient as unknown as Patient;
  }

  async remove(id: string): Promise<void> {
    await this.prisma.patient.delete({
      where: { id },
    });
  }

  async getAppointments(patientId: string) {
    const appointments = await this.prisma.appointment.findMany({
      where: { patientId },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        vitalSign: true,
        prescription: {
          include: {
            medications: true,
          },
        },
        invoice: true,
      },
      orderBy: { startTime: 'desc' },
    });
    return appointments;
  }

  async getDocuments(patientId: string) {
    const documents = await this.prisma.document.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
    return documents;
  }
}
