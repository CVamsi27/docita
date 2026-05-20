import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { AppointmentStatus, Prisma } from '@workspace/db';
import { runInArchivalMode } from '@/shared/common/extensions/audit-immutability.extension';

function toNullableJsonInput(
  value: Prisma.JsonValue | null,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value === null) {
    return Prisma.JsonNull;
  }

  return value;
}

@Injectable()
export class ArchivalService {
  private readonly logger = new Logger(ArchivalService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async archiveAuditLogs(daysOld = 90): Promise<number> {
    // RLS-BYPASS: compliance retention and archival jobs span tenants by design
    return this.prisma.runUnrestricted(async () =>
      runInArchivalMode(async () => {
        const cutoffDate = this.clock.now();
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
            await tx.auditLogArchive.createMany({
              data: records.map((record) => ({
                id: record.id,
                clinicId: record.clinicId,
                userId: record.userId,
                action: record.action,
                entityType: record.entityType,
                entityId: record.entityId,
                oldValue: toNullableJsonInput(record.oldValue),
                newValue: toNullableJsonInput(record.newValue),
                ipAddress: record.ipAddress,
                userAgent: record.userAgent,
                status: record.status,
                errorMessage: record.errorMessage,
                metadata: toNullableJsonInput(record.metadata),
                createdAt: record.createdAt,
                archivedAt: this.clock.now(),
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
      }),
    );
  }

  async archiveWhatsappLogs(daysOld = 180): Promise<number> {
    // RLS-BYPASS: compliance retention and archival jobs span tenants by design
    return this.prisma.runUnrestricted(async () => {
      const cutoffDate = this.clock.now();
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
              requestBody: toNullableJsonInput(record.requestBody),
              responseBody: toNullableJsonInput(record.responseBody),
              errorMessage: record.errorMessage,
              createdAt: record.createdAt,
              updatedAt: record.updatedAt,
              deliveredAt: record.deliveredAt,
              archivedAt: this.clock.now(),
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
    });
  }

  async archiveAppointments(yearsOld = 2): Promise<number> {
    // RLS-BYPASS: compliance retention and archival jobs span tenants by design
    return this.prisma.runUnrestricted(async () => {
      const cutoffDate = this.clock.now();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsOld);

      this.logger.log(
        `Starting archival for Appointments older than ${cutoffDate.toISOString()}`,
      );

      let totalArchived = 0;
      const batchSize = 200;

      while (true) {
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
              generalExamination: toNullableJsonInput(
                record.generalExamination,
              ),
              historyOfPresentIllness: record.historyOfPresentIllness,
              investigations: toNullableJsonInput(record.investigations),
              pastMedicalHistory: record.pastMedicalHistory,
              provisionalDiagnosis: record.provisionalDiagnosis,
              reviewOfSystems: record.reviewOfSystems,
              systemicExamination: toNullableJsonInput(
                record.systemicExamination,
              ),
              treatmentPlan: record.treatmentPlan,
              dentalChart: toNullableJsonInput(record.dentalChart),
              growthData: toNullableJsonInput(record.growthData),
              ophthalmologyExam: toNullableJsonInput(record.ophthalmologyExam),
              cardiologyExam: toNullableJsonInput(record.cardiologyExam),
              gynecologyExam: toNullableJsonInput(record.gynecologyExam),
              dermatologyExam: toNullableJsonInput(record.dermatologyExam),
              psychiatryExam: toNullableJsonInput(record.psychiatryExam),
              encounterSummary: record.encounterSummary,
              priority: record.priority,
              archivedAt: this.clock.now(),
            })),
            skipDuplicates: true,
          });

          await tx.appointment.deleteMany({
            where: { id: { in: records.map((r) => r.id) } },
          });
        });

        totalArchived += records.length;
        this.logger.log(`Archived ${totalArchived} Appointments so far...`);
      }

      return totalArchived;
    });
  }
}
