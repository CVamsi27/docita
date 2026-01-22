import { Test, TestingModule } from '@nestjs/testing';
import { UserFactory } from './user.factory';
import { Role } from '@workspace/db';

describe('UserFactory', () => {
  let factory: UserFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserFactory],
    }).compile();

    factory = module.get<UserFactory>(UserFactory);
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  describe('create', () => {
    it('should create user input for DOCTOR role', () => {
      const data = {
        email: 'doctor@test.com',
        name: 'Dr Test',
        passwordHash: 'hashed',
        clinicId: 'clinic-1',
      };

      const result = factory.create(Role.DOCTOR, data);

      expect(result).toEqual({
        email: data.email,
        name: data.name,
        password: data.passwordHash,
        role: Role.DOCTOR,
        clinic: { connect: { id: data.clinicId } },
      });
    });

    it('should create user input for ADMIN role', () => {
      const data = {
        email: 'admin@test.com',
        name: 'Admin Test',
        passwordHash: 'hashed',
        clinicId: 'clinic-1',
      };

      const result = factory.create(Role.ADMIN, data);

      expect(result).toEqual({
        email: data.email,
        name: data.name,
        password: data.passwordHash,
        role: Role.ADMIN,
        clinic: { connect: { id: data.clinicId } },
      });
    });

    it('should handle missing clinicId', () => {
      const data = {
        email: 'admin@test.com',
        name: 'Admin Test',
        passwordHash: 'hashed',
      };

      const result = factory.create(Role.ADMIN, data);

      expect(result.clinic).toBeUndefined();
    });
  });
});
