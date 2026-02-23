import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppointmentStatus } from '@workspace/db';

@Injectable()
export class ArchivalService {
  private readonly logger = new Logger(ArchivalService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Move old AuditLogs to AuditLogArchive
   */
  async archiveAuditLogs(daysOld = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    this.logger.log(
      `Starting archival for AuditLogs older than ${cutoffDate.toISOString()}`,
    );

    let totalArchived = 0;
    const batchSize = 500;

    while (true) {
      const records = await this.prisma.auditLog.findMany({
        where: { createdAt: { lt: cutoffDate } },
        take: batchSize,
      });

      if (records.length === 0) break;

      await this.prisma.$transaction(async (tx) => {
        // Mirror the data - omitting relations as defined in schema
        await tx.auditLogArchive.createMany({
          data: records.map((record) => ({
            id: record.id,
            clinicId: record.clinicId,
            userId: record.userId,
            action: record.action,
            entityType: record.entityType,
            entityId: record.entityId,
            oldValue: record.oldValue as any,
            newValue: record.newValue as any,
            ipAddress: record.ipAddress,
            userAgent: record.userAgent,
            status: record.status,
            errorMessage: record.errorMessage,
            metadata: record.metadata as any,
            createdAt: record.createdAt,
            archivedAt: new Date(),
          })),
          skipDuplicates: true,
        });

        await tx.auditLog.deleteMany({
          where: { id: { in: records.map((r) => r.id) } },
        });
      });

      totalArchived += records.length;
      this.logger.log(`Archived ${totalArchived} AuditLogs so far...`);
    }

    return totalArchived;
  }

  /**
   * Move old WhatsappLogs to WhatsappLogArchive
   */
  async archiveWhatsappLogs(daysOld = 180): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    this.logger.log(
      `Starting archival for WhatsappLogs older than ${cutoffDate.toISOString()}`,
    );

    let totalArchived = 0;
    const batchSize = 500;

    while (true) {
      const records = await this.prisma.whatsappLog.findMany({
        where: { createdAt: { lt: cutoffDate } },
        take: batchSize,
      });

      if (records.length === 0) break;

      await this.prisma.$transaction(async (tx) => {
        await tx.whatsappLogArchive.createMany({
          data: records.map((record) => ({
            id: record.id,
            clinicId: record.clinicId,
            patientId: record.patientId,
            paymentSessionId: record.paymentSessionId,
            invoiceId: record.invoiceId,
            prescriptionId: record.prescriptionId,
            type: record.type,
            provider: record.provider,
            providerMessageId: record.providerMessageId,
            phoneNumber: record.phoneNumber,
            message: record.message,
            status: record.status,
            requestBody: record.requestBody as any,
            responseBody: record.responseBody as any,
            errorMessage: record.errorMessage,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            deliveredAt: record.deliveredAt,
            archivedAt: new Date(),
          })),
          skipDuplicates: true,
        });

        await tx.whatsappLog.deleteMany({
          where: { id: { in: records.map((r) => r.id) } },
        });
      });

      totalArchived += records.length;
      this.logger.log(`Archived ${totalArchived} WhatsappLogs so far...`);
    }

    return totalArchived;
  }

  /**
   * Move old stable Appointments to AppointmentArchive
   */
  async archiveAppointments(yearsOld = 2): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsOld);

    this.logger.log(
      `Starting archival for Appointments older than ${cutoffDate.toISOString()}`,
    );

    let totalArchived = 0;
    const batchSize = 200;

    while (true) {
      // Only archive COMPLETED or CANCELLED appointments that are ancient
      const records = await this.prisma.appointment.findMany({
        where: {
          startTime: { lt: cutoffDate },
          status: {
            in: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED],
          },
        },
        take: batchSize,
      });

      if (records.length === 0) break;

      await this.prisma.$transaction(async (tx) => {
        await tx.appointmentArchive.createMany({
          data: records.map((record) => ({
            id: record.id,
            patientId: record.patientId,
            doctorId: record.doctorId,
            startTime: record.startTime,
            endTime: record.endTime,
            status: record.status,
            type: record.type,
            notes: record.notes,
            consultationNotes: record.consultationNotes,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            clinicId: record.clinicId,
            observations: record.observations,
            chiefComplaint: record.chiefComplaint,
            treatmentHistory: record.treatmentHistory,
            clinicalImpression: record.clinicalImpression,
            differentialDiagnosis: record.differentialDiagnosis,
            finalDiagnosis: record.finalDiagnosis,
            followUpPlan: record.followUpPlan,
            generalExamination: record.generalExamination as any,
            historyOfPresentIllness: record.historyOfPresentIllness,
            investigations: record.investigations as any,
            pastMedicalHistory: record.pastMedicalHistory,
            provisionalDiagnosis: record.provisionalDiagnosis,
            reviewOfSystems: record.reviewOfSystems,
            systemicExamination: record.systemicExamination as any,
            treatmentPlan: record.treatmentPlan,
            dentalChart: record.dentalChart as any,
            growthData: record.growthData as any,
            ophthalmologyExam: record.ophthalmologyExam as any,
            cardiologyExam: record.cardiologyExam as any,
            gynecologyExam: record.gynecologyExam as any,
            dermatologyExam: record.dermatologyExam as any,
            psychiatryExam: record.psychiatryExam as any,
            encounterSummary: record.encounterSummary,
            priority: record.priority,
            archivedAt: new Date(),
          })),
          skipDuplicates: true,
        });

        // NOTE: Relations like VitalSign, Prescription, etc. might still point to this ID.
        // In a true archival system, those should also be archived or the FK should be set to NULL.
        // For Phase 1, we focus on log tables and root appointment records.
        await tx.appointment.deleteMany({
          where: { id: { in: records.map((r) => r.id) } },
        });
      });

      totalArchived += records.length;
      this.logger.log(`Archived ${totalArchived} Appointments so far...`);
    }

    return totalArchived;
  }
}
