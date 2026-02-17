/**
 * Database Query Optimization Examples and Best Practices
 * 
 * COST OPTIMIZATION STRATEGIES:
 * - Reduce N+1 queries
 * - Use proper indexing
 * - Implement connection pooling
 * - Batch operations
 * - Use select to fetch only needed fields
 * 
 * ESTIMATED SAVINGS:
 * - Query reduction: ~30% database cost savings
 * - Proper indexing: ~40% faster queries
 * - Connection pooling: ~25% connection overhead reduction
 * - Total: ~50% database cost optimization
 */

import { PrismaService } from '../../prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class QueryOptimizationService {
  constructor(private prisma: PrismaService) {}

  /**
   * ❌ BAD: N+1 Query Problem
   * Makes 1 query to get appointments, then N queries to get patient details
   */
  async getAppointmentsBad(clinicId: string) {
    const appointments = await this.prisma.appointment.findMany({
      where: { clinicId },
    });

    // N+1: Queries patient for each appointment individually
    for (const appointment of appointments) {
      const patient = await this.prisma.patient.findUnique({
        where: { id: appointment.patientId },
      });
      (appointment as any).patient = patient;
    }

    return appointments;
  }

  /**
   * ✅ GOOD: Use include to fetch related data in single query
   * Makes only 1 query with JOIN
   */
  async getAppointmentsGood(clinicId: string) {
    return this.prisma.appointment.findMany({
      where: { clinicId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            // Select only needed fields to reduce data transfer
          },
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * ❌ BAD: Fetching all fields when only few are needed
   */
  async getUserEmailsBad(clinicId: string) {
    const users = await this.prisma.user.findMany({
      where: { clinicId },
    });
    return users.map((u) => u.email);
  }

  /**
   * ✅ GOOD: Use select to fetch only needed fields
   * Reduces data transfer by ~80% in this case
   */
  async getUserEmailsGood(clinicId: string) {
    const users = await this.prisma.user.findMany({
      where: { clinicId },
      select: {
        email: true,
      },
    });
    return users.map((u) => u.email);
  }

  /**
   * ❌ BAD: Sequential queries
   */
  async getDashboardDataBad(clinicId: string) {
    const patients = await this.prisma.patient.count({ where: { clinicId } });
    const appointments = await this.prisma.appointment.count({
      where: { clinicId },
    });
    const revenue = await this.prisma.invoice.aggregate({
      where: { clinicId },
      _sum: { total: true },
    });
    return { patients, appointments, revenue: revenue._sum.total };
  }

  /**
   * ✅ GOOD: Parallel queries using Promise.all
   * Reduces total query time by ~60%
   */
  async getDashboardDataGood(clinicId: string) {
    const [patients, appointments, revenue] = await Promise.all([
      this.prisma.patient.count({ where: { clinicId } }),
      this.prisma.appointment.count({ where: { clinicId } }),
      this.prisma.invoice.aggregate({
        where: { clinicId },
        _sum: { total: true },
      }),
    ]);

    return {
      patients,
      appointments,
      revenue: revenue._sum.total || 0,
    };
  }

  /**
   * ❌ BAD: Loading all records into memory, then filtering in code
   */
  async getActivePatientsBad(clinicId: string) {
    const allPatients = await this.prisma.patient.findMany({
      where: { clinicId },
    });
    // Filtering in application code - inefficient!
    return allPatients.filter((p) => p.isActive);
  }

  /**
   * ✅ GOOD: Filter in database using WHERE clause
   * Database is optimized for filtering (uses indexes)
   */
  async getActivePatientsGood(clinicId: string) {
    return this.prisma.patient.findMany({
      where: {
        clinicId,
        isActive: true, // Database filters using index
      },
    });
  }

  /**
   * ❌ BAD: Updating records one by one
   */
  async markAppointmentsCompletedBad(appointmentIds: string[]) {
    for (const id of appointmentIds) {
      await this.prisma.appointment.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });
    }
  }

  /**
   * ✅ GOOD: Use updateMany for batch operations
   * ~90% faster for large batches
   */
  async markAppointmentsCompletedGood(appointmentIds: string[]) {
    return this.prisma.appointment.updateMany({
      where: {
        id: { in: appointmentIds },
      },
      data: {
        status: 'COMPLETED',
      },
    });
  }

  /**
   * ✅ BEST PRACTICE: Use transactions for data consistency
   */
  async createAppointmentWithInvoice(appointmentData: any, invoiceData: any) {
    return this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({
        data: appointmentData,
      });

      const invoice = await tx.invoice.create({
        data: {
          ...invoiceData,
          appointmentId: appointment.id,
        },
      });

      return { appointment, invoice };
    });
  }

  /**
   * ✅ OPTIMIZATION: Use indexes effectively
   * 
   * Add these to your schema:
   * 
   * @@index([clinicId, status, startTime]) // Composite index for common queries
   * @@index([doctorId, startTime]) // For doctor schedule queries
   * @@index([patientId]) // For patient history queries
   */

  /**
   * ✅ OPTIMIZATION: Use cursor-based pagination for large datasets
   * More efficient than offset-based pagination
   */
  async getPaginatedAppointments(params: {
    clinicId: string;
    cursor?: string;
    limit: number;
  }) {
    const appointments = await this.prisma.appointment.findMany({
      where: { clinicId: params.clinicId },
      take: params.limit + 1, // Fetch one extra to check if there's more
      ...(params.cursor && {
        cursor: { id: params.cursor },
        skip: 1, // Skip the cursor
      }),
      orderBy: { startTime: 'desc' },
    });

    const hasMore = appointments.length > params.limit;
    const items = hasMore ? appointments.slice(0, -1) : appointments;
    const nextCursor = hasMore
      ? items[items.length - 1].id
      : undefined;

    return {
      items,
      nextCursor,
      hasMore,
    };
  }
}

/**
 * CONNECTION POOLING CONFIGURATION
 * 
 * Add to your Prisma schema:
 * 
 * datasource db {
 *   provider = "postgresql"
 *   url      = env("DATABASE_URL")
 *   directUrl = env("DIRECT_DATABASE_URL")
 * }
 * 
 * DATABASE_URL with pooling (for most queries):
 * postgresql://user:password@host:5432/dbname?pgbouncer=true&connection_limit=10
 * 
 * DIRECT_DATABASE_URL (for migrations, transactions):
 * postgresql://user:password@host:5432/dbname
 * 
 * Neon-specific optimization:
 * - Use connection pooling: reduces connection overhead by ~70%
 * - Set connection_limit based on your plan
 * - Use directUrl for migrations and schema changes
 */

/**
 * INDEX RECOMMENDATIONS
 * 
 * Run this query to find missing indexes:
 * 
 * SELECT schemaname, tablename, attname, n_distinct, correlation
 * FROM pg_stats
 * WHERE schemaname = 'public'
 * AND n_distinct > 100
 * ORDER BY abs(correlation) DESC;
 * 
 * Common indexes needed:
 * - Appointment: (clinicId, startTime, status)
 * - Patient: (clinicId, email), (clinicId, phoneNumber)
 * - Invoice: (clinicId, status, createdAt)
 * - User: (clinicId, role, isActive)
 */
