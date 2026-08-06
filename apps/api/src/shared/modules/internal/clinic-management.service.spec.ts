import { BadRequestException } from '@nestjs/common';
import { Role } from '@workspace/db';
import { ClinicManagementService } from './clinic-management.service';

describe('ClinicManagementService admin lifecycle', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const paymentGateway = {} as never;
  const clinicFactory = {} as never;
  const userFactory = {} as never;

  let service: ClinicManagementService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ClinicManagementService(
      prisma as never,
      paymentGateway,
      clinicFactory,
      userFactory,
    );
  });

  it('deactivateAdmin sets appLoginDisabled to true', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      role: Role.ADMIN,
    });
    prisma.user.update.mockResolvedValue({
      id: 'admin-1',
      name: 'Admin',
      email: 'admin@clinic.test',
      phoneNumber: null,
      role: Role.ADMIN,
      appLoginDisabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.deactivateAdmin('admin-1');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'admin-1' },
      data: { appLoginDisabled: true },
      select: expect.objectContaining({ appLoginDisabled: true }),
    });
    expect(result.appLoginDisabled).toBe(true);
  });

  it('activateAdmin clears appLoginDisabled', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      role: Role.ADMIN_DOCTOR,
    });
    prisma.user.update.mockResolvedValue({
      id: 'admin-1',
      name: 'Admin Doctor',
      email: 'doc@clinic.test',
      phoneNumber: null,
      role: Role.ADMIN_DOCTOR,
      appLoginDisabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.activateAdmin('admin-1');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'admin-1' },
      data: { appLoginDisabled: false },
      select: expect.objectContaining({ appLoginDisabled: true }),
    });
    expect(result.appLoginDisabled).toBe(false);
  });

  it('deactivateAdmin rejects non-admin roles', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: Role.DOCTOR,
    });

    await expect(service.deactivateAdmin('user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  describe('P5.11 cross-clinic lists', () => {
    it('getAllAdmins queries only clinic admin roles across all clinics', async () => {
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'admin-1',
          name: 'Admin',
          email: 'admin@clinic.test',
          phoneNumber: null,
          role: Role.ADMIN,
          appLoginDisabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getAllAdmins();

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: { in: expect.any(Array) } },
          select: expect.objectContaining({ appLoginDisabled: true }),
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('getAllUsers excludes INTERNAL role and attaches the clinic name', async () => {
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'user-1',
          name: 'Doctor',
          email: 'doc@clinic.test',
          role: Role.DOCTOR,
          phoneNumber: null,
          specialization: null,
          qualification: null,
          registrationNumber: null,
          yearsOfExperience: null,
          bio: null,
          clinicId: 'clinic-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          clinic: { name: 'Clinic One' },
        },
      ]);

      const result = await service.getAllUsers();

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: { not: Role.INTERNAL } },
          select: expect.objectContaining({
            clinic: { select: { name: true } },
          }),
        }),
      );
      expect(result[0]).toEqual(
        expect.objectContaining({ clinicName: 'Clinic One' }),
      );
    });

    it('getAllUsers leaves clinicName undefined when the user has no clinic', async () => {
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'user-2',
          name: 'Lone User',
          email: 'lone@test.test',
          role: Role.DOCTOR,
          phoneNumber: null,
          specialization: null,
          qualification: null,
          registrationNumber: null,
          yearsOfExperience: null,
          bio: null,
          clinicId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          clinic: null,
        },
      ]);

      const result = await service.getAllUsers();

      expect(result[0]).toEqual(
        expect.objectContaining({ clinicName: undefined }),
      );
    });
  });
});
