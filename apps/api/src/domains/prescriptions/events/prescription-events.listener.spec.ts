import { Test, TestingModule } from '@nestjs/testing';
import { PrescriptionEventsListener } from './prescription-events.listener';
import { PrismaService } from '../../../prisma/prisma.service';
import { WhatsAppNotificationService } from '../../../common/services/whatsapp-notification.service';
import { PrescriptionCreatedEvent } from './prescription-created.event';

describe('PrescriptionEventsListener', () => {
  let listener: PrescriptionEventsListener;
  let prismaService: PrismaService;
  let whatsappNotificationService: WhatsAppNotificationService;

  const mockPrescription = {
    id: 'presc-1',
    clinicId: 'clinic-1',
    patient: {
      id: 'patient-1',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '1234567890',
    },
    medications: [
      {
        name: 'Paracetamol',
        dosage: '500mg',
        frequency: 'Twice daily',
      },
    ],
    instructions: 'Take correctly',
  };

  const mockClinic = {
    id: 'clinic-1',
    name: 'Test Clinic',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriptionEventsListener,
        {
          provide: PrismaService,
          useValue: {
            prescription: {
              findUnique: jest.fn(),
            },
            clinic: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: WhatsAppNotificationService,
          useValue: {
            sendNotification: jest.fn().mockResolvedValue({ sent: true }),
          },
        },
      ],
    }).compile();

    listener = module.get<PrescriptionEventsListener>(
      PrescriptionEventsListener,
    );
    prismaService = module.get<PrismaService>(PrismaService);
    whatsappNotificationService = module.get<WhatsAppNotificationService>(
      WhatsAppNotificationService,
    );
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  it('should handle prescription.created event successfully', async () => {
    (prismaService.prescription.findUnique as jest.Mock).mockResolvedValue(
      mockPrescription,
    );
    (prismaService.clinic.findUnique as jest.Mock).mockResolvedValue(
      mockClinic,
    );

    const event = new PrescriptionCreatedEvent('presc-1', 'clinic-1');
    await listener.handlePrescriptionCreatedEvent(event);

    expect(prismaService.prescription.findUnique).toHaveBeenCalledWith({
      where: { id: 'presc-1' },
      include: {
        patient: {
          select: { firstName: true, lastName: true, phoneNumber: true },
        },
        medications: true,
      },
    });

    expect(whatsappNotificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'prescription',
        clinicId: 'clinic-1',
        phoneNumber: '1234567890',
        message: expect.stringContaining('Paracetamol'),
        entityId: 'presc-1',
      }),
    );
  });

  it('should skip if prescription or phone number is missing', async () => {
    (prismaService.prescription.findUnique as jest.Mock).mockResolvedValue(
      null,
    );

    const event = new PrescriptionCreatedEvent('presc-1', 'clinic-1');
    await listener.handlePrescriptionCreatedEvent(event);

    expect(whatsappNotificationService.sendNotification).not.toHaveBeenCalled();
  });
});
