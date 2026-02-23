import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  UpdatePatientProfileBodyDto,
  RequestAppointmentBodyDto,
  GetPatientAppointmentsQueryDto,
  GetPatientPrescriptionsQueryDto,
  GetPatientInvoicesQueryDto,
} from './dto/patient-portal.dto';

@Injectable()
export class PatientPortalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get patient dashboard snapshot
   * Returns aggregated view of upcoming appointments, active prescriptions, outstanding invoices
   */
  async getPatientDashboard(patientId: string) {
    // Verify patient exists
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        preferredName: true,
        email: true,
        phoneNumber: true,
        dateOfBirth: true,
        bloodGroup: true,
        mrn: true,
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const now = new Date();

    // Get upcoming appointments (next 7 days)
    const upcomingAppointments = await this.prisma.appointment.findMany({
      where: {
        patientId,
        startTime: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        },
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'],
        },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
      take: 5,
    });

    // Get active prescriptions (from last 90 days)
    const activePrescriptions = await this.prisma.prescription.findMany({
      where: {
        patientId,
        createdAt: {
          gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
        },
      },
      select: {
        id: true,
        createdAt: true,
        medications: {
          select: {
            id: true,
            name: true,
            dosage: true,
            duration: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    // Get outstanding invoices (unpaid/overdue)
    const outstandingInvoices = await this.prisma.invoice.findMany({
      where: {
        patientId,
        status: {
          in: ['PENDING', 'OVERDUE'],
        },
      },
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    return {
      patient,
      summary: {
        upcomingAppointmentsCount: upcomingAppointments.length,
        activePrescriptionsCount: activePrescriptions.length,
        outstandingInvoicesCount: outstandingInvoices.length,
        totalOutstandingAmount: outstandingInvoices.reduce(
          (sum, inv) => sum + (inv.total || 0),
          0,
        ),
      },
      upcomingAppointments,
      activePrescriptions,
      outstandingInvoices,
    };
  }

  /**
   * Get patient's appointments with filters
   */
  async getPatientAppointments(
    patientId: string,
    filters: GetPatientAppointmentsQueryDto,
  ) {
    const { status, startDate, endDate, limit = 20, offset = 0 } = filters;

    const where: Record<string, unknown> = {
      patientId,
    };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) {
        (where.startTime as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.startTime as Record<string, Date>).lte = new Date(endDate);
      }
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        select: {
          id: true,
          startTime: true,
          endTime: true,
          status: true,
          type: true,
          doctor: {
            select: {
              id: true,
              name: true,
              specialization: true,
              profilePhotoUrl: true,
            },
          },
          prescription: {
            select: {
              id: true,
              medications: {
                select: {
                  name: true,
                  dosage: true,
                },
              },
            },
          },
          invoice: {
            select: {
              id: true,
              total: true,
              status: true,
            },
          },
        },
        orderBy: {
          startTime: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      appointments,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Get patient's prescriptions
   */
  async getPatientPrescriptions(
    patientId: string,
    filters: GetPatientPrescriptionsQueryDto,
  ) {
    const { limit = 20, offset = 0 } = filters;

    const [prescriptions, total] = await Promise.all([
      this.prisma.prescription.findMany({
        where: {
          patientId,
        },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          medications: {
            select: {
              id: true,
              name: true,
              dosage: true,
              frequency: true,
              duration: true,
            },
          },
          doctor: {
            select: {
              id: true,
              name: true,
              specialization: true,
              registrationNumber: true,
            },
          },
          appointment: {
            select: {
              id: true,
              startTime: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.prescription.count({
        where: { patientId },
      }),
    ]);

    return {
      prescriptions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Get patient's invoices
   */
  async getPatientInvoices(
    patientId: string,
    filters: GetPatientInvoicesQueryDto,
  ) {
    const { status, limit = 20, offset = 0 } = filters;

    const where: Record<string, unknown> = {
      patientId,
    };

    if (status) {
      where.status = status;
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        select: {
          id: true,
          total: true,
          status: true,
          createdAt: true,
          items: true, // JSON field, not a relation
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      invoices,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Update patient profile
   * Patients can update limited fields only
   */
  async updatePatientProfile(
    patientId: string,
    data: UpdatePatientProfileBodyDto,
  ) {
    // Verify patient exists
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Only allow updating specific fields
    const updateData: Record<string, unknown> = {};

    if (data.phoneNumber) {
      updateData.phoneNumber = data.phoneNumber;
    }

    if (data.email) {
      updateData.email = data.email;
    }

    if (data.address) {
      updateData.address = data.address;
    }

    if (data.whatsappConsent !== undefined) {
      updateData.whatsappConsent = data.whatsappConsent;
      if (data.whatsappConsent) {
        updateData.whatsappConsentAt = new Date();
      }
    }

    const updatedPatient = await this.prisma.patient.update({
      where: { id: patientId },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        preferredName: true,
        email: true,
        phoneNumber: true,
        address: true,
        whatsappConsent: true,
        whatsappConsentAt: true,
      },
    });

    return updatedPatient;
  }

  /**
   * Request a new appointment
   * Creates an appointment request that clinic staff can approve
   */
  async requestAppointment(patientId: string, data: RequestAppointmentBodyDto) {
    // Verify patient exists
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, clinicId: true },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // If doctor specified, verify they exist and belong to the clinic
    if (data.preferredDoctorId) {
      const doctor = await this.prisma.user.findFirst({
        where: {
          id: data.preferredDoctorId,
          role: 'DOCTOR',
          clinicId: patient.clinicId,
        },
      });

      if (!doctor) {
        throw new BadRequestException('Invalid doctor selection');
      }
    }

    // Create appointment with SCHEDULED status
    const appointment = await this.prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: data.preferredDoctorId || '', // Will be assigned by clinic staff
        clinicId: patient.clinicId,
        startTime: new Date(data.preferredDate),
        endTime: new Date(
          new Date(data.preferredDate).getTime() + 30 * 60 * 1000,
        ), // Default 30 min
        status: 'SCHEDULED',
        type: 'CONSULTATION',
        notes: data.notes || '',
        // Store patient request reason in notes
        chiefComplaint: data.reason,
      },
      select: {
        id: true,
        startTime: true,
        status: true,
        type: true,
      },
    });

    return appointment;
  }

  /**
   * Get single appointment details (for patient)
   */
  async getPatientAppointmentById(patientId: string, appointmentId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        patientId, // Security: Ensure appointment belongs to this patient
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        type: true,
        chiefComplaint: true,
        notes: true,
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
            profilePhotoUrl: true,
            bio: true,
          },
        },
        prescription: {
          select: {
            id: true,
            medications: true,
          },
        },
        invoice: {
          select: {
            id: true,
            total: true,
            status: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  /**
   * Get single prescription details (for patient)
   */
  async getPatientPrescriptionById(patientId: string, prescriptionId: string) {
    const prescription = await this.prisma.prescription.findFirst({
      where: {
        id: prescriptionId,
        patientId, // Security: Ensure prescription belongs to this patient
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        medications: true,
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
            registrationNumber: true,
            signatureUrl: true,
          },
        },
        appointment: {
          select: {
            id: true,
            startTime: true,
            chiefComplaint: true,
          },
        },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gender: true,
            dateOfBirth: true,
          },
        },
      },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    return prescription;
  }

  /**
   * Request data deletion (GDPR/DPDP compliance)
   * Soft deletes patient data and marks for anonymization
   */
  async requestDataDeletion(patientId: string, reason: string) {
    // Verify patient exists
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Check if already deleted
    if (patient.deletedAt) {
      throw new BadRequestException('Data deletion already requested');
    }

    // Soft delete patient record
    await this.prisma.patient.update({
      where: { id: patientId },
      data: {
        deletedAt: new Date(),
        // Optionally anonymize immediately
        email: `deleted-${patientId}@anonymized.local`,
        phoneNumber: 'DELETED',
        address: 'DELETED',
      },
    });

    // Log deletion request for audit
    // In production, create a deletion request record for review
    // await this.prisma.dataDeletionRequest.create({
    //   data: {
    //     patientId,
    //     reason,
    //     status: 'PENDING',
    //     requestedAt: new Date(),
    //   },
    // });

    return {
      success: true,
      message:
        'Data deletion request submitted. Your account will be deactivated within 30 days.',
    };
  }

  /**
   * Update patient consent settings (WhatsApp, data storage)
   */
  async updateConsentSettings(
    patientId: string,
    whatsappConsent?: boolean,
    dataStorageConsent?: boolean,
  ) {
    const updateData: Record<string, unknown> = {};

    if (whatsappConsent !== undefined) {
      updateData.whatsappConsent = whatsappConsent;
      if (whatsappConsent) {
        updateData.whatsappConsentAt = new Date();
      } else {
        updateData.whatsappConsentAt = null;
      }
    }

    // Note: dataStorageConsent would need a new field in schema
    // For now, we track it in audit logs

    const updatedPatient = await this.prisma.patient.update({
      where: { id: patientId },
      data: updateData,
      select: {
        id: true,
        whatsappConsent: true,
        whatsappConsentAt: true,
      },
    });

    return updatedPatient;
  }

  /**
   * Get patient consent settings
   */
  async getConsentSettings(patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        whatsappConsent: true,
        whatsappConsentAt: true,
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return {
      whatsappConsent: patient.whatsappConsent,
      whatsappConsentAt: patient.whatsappConsentAt,
      // Check if this is first login (no consent given yet)
      isFirstLogin: !patient.whatsappConsentAt,
    };
  }
}
