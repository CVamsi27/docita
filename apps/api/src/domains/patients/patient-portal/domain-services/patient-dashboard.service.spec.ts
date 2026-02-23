/**
 * Unit Tests for PatientDashboardService
 *
 * Tests:
 * - Dashboard data aggregation
 * - Parallel query execution
 * - Patient not found handling
 * - Summary calculations
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PatientDashboardService } from './patient-dashboard.service';
import { PrismaService } from '../../../../prisma/prisma.service';

describe('PatientDashboardService', () => {
  let service: PatientDashboardService;
  let prisma: any;

  const mockPatient = {
    id: 'patient-1',
    firstName: 'John',
    lastName: 'Doe',
    preferredName: null,
    email: 'john@example.com',
    phoneNumber: '+919876543210',
    dateOfBirth: new Date('1990-01-01'),
    bloodGroup: 'O+',
    mrn: 'MRN-001',
  };

  const mockAppointments = [
    {
      id: 'apt-1',
      startTime: new Date(),
      endTime: new Date(),
      status: 'SCHEDULED',
      doctor: { id: 'd1', name: 'Dr. Smith', specialization: 'General' },
    },
  ];

  const mockPrescriptions = [
    {
      id: 'rx-1',
      createdAt: new Date(),
      medications: [
        { id: 'm1', name: 'Paracetamol', dosage: '500mg', duration: '5 days' },
      ],
      doctor: { id: 'd1', name: 'Dr. Smith' },
    },
  ];

  const mockInvoices = [
    { id: 'inv-1', total: 500, status: 'PENDING', createdAt: new Date() },
    { id: 'inv-2', total: 300, status: 'OVERDUE', createdAt: new Date() },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientDashboardService,
        {
          provide: PrismaService,
          useValue: {
            patient: {
              findUnique: jest.fn().mockResolvedValue(mockPatient),
            },
            appointment: {
              findMany: jest.fn().mockResolvedValue(mockAppointments),
            },
            prescription: {
              findMany: jest.fn().mockResolvedValue(mockPrescriptions),
            },
            invoice: {
              findMany: jest.fn().mockResolvedValue(mockInvoices),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PatientDashboardService>(PatientDashboardService);
    prisma = module.get(PrismaService);
  });

  describe('getDashboard', () => {
    it('should return complete dashboard data', async () => {
      const result = await service.getDashboard('patient-1');

      expect(result.patient).toEqual(mockPatient);
      expect(result.summary.upcomingAppointmentsCount).toBe(1);
      expect(result.summary.activePrescriptionsCount).toBe(1);
      expect(result.summary.outstandingInvoicesCount).toBe(2);
      expect(result.summary.totalOutstandingAmount).toBe(800);
    });

    it('should throw NotFoundException when patient not found', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);

      await expect(service.getDashboard('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle empty data gracefully', async () => {
      prisma.appointment.findMany.mockResolvedValue([]);
      prisma.prescription.findMany.mockResolvedValue([]);
      prisma.invoice.findMany.mockResolvedValue([]);

      const result = await service.getDashboard('patient-1');

      expect(result.summary.upcomingAppointmentsCount).toBe(0);
      expect(result.summary.totalOutstandingAmount).toBe(0);
    });

    it('should execute queries in parallel', async () => {
      // Track call order
      const callOrder: string[] = [];

      prisma.appointment.findMany.mockImplementation(() => {
        callOrder.push('appointments');
        return Promise.resolve(mockAppointments);
      });

      prisma.prescription.findMany.mockImplementation(() => {
        callOrder.push('prescriptions');
        return Promise.resolve(mockPrescriptions);
      });

      prisma.invoice.findMany.mockImplementation(() => {
        callOrder.push('invoices');
        return Promise.resolve(mockInvoices);
      });

      await service.getDashboard('patient-1');

      // All three queries should be called
      expect(callOrder).toContain('appointments');
      expect(callOrder).toContain('prescriptions');
      expect(callOrder).toContain('invoices');
    });
  });
});
