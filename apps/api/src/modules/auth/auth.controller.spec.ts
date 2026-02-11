import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    checkEmailExists: jest.fn(),
    validateUser: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    changePassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('checkEmail', () => {
    it('should return exists boolean', async () => {
      mockAuthService.checkEmailExists.mockResolvedValue(true);
      const result = await controller.checkEmail({ email: 'test@example.com' });
      expect(result).toEqual({ exists: true });
      expect(mockAuthService.checkEmailExists).toHaveBeenCalledWith(
        'test@example.com',
      );
    });
  });

  describe('login', () => {
    it('should return token on successful login', async () => {
      const user = { id: '1', email: 'test@example.com' };
      const token = { accessToken: 'token', user };
      mockAuthService.validateUser.mockResolvedValue(user);
      mockAuthService.login.mockReturnValue(token);

      const result = await controller.login({
        email: 'test@example.com',
        password: 'password',
      });
      expect(result).toEqual(token);
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      mockAuthService.validateUser.mockResolvedValue(null);
      await expect(
        controller.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should verify registration parameters and call logic', async () => {
      const dto = {
        email: 'new@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe',
        clinicName: 'Clinic',
      };

      const expectedCall = {
        email: dto.email,
        password: dto.password,
        name: 'John Doe',
        clinicName: dto.clinicName,
      };

      mockAuthService.register.mockResolvedValue({ id: '1', ...expectedCall });

      await controller.register(dto);
      expect(mockAuthService.register).toHaveBeenCalledWith(expectedCall);
    });
  });
});
