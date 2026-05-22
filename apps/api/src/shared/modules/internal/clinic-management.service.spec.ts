import { BadRequestException } from '@nestjs/common';
import { Role } from '@workspace/db';
import { ClinicManagementService } from './clinic-management.service';

describe('ClinicManagementService admin lifecycle', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
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
});
