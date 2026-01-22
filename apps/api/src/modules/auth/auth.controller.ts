import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  LoginDto,
  RegisterDto,
  ChangePasswordDto,
  LoginResponseDto,
  RegisterResponseDto,
  ValidateSessionResponseDto,
  ChangePasswordResponseDto,
  CheckEmailDto,
  CheckEmailResponseDto,
} from './dto/auth.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthenticatedRequest } from '@workspace/types';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('check-email')
  @ZodSerializerDto(CheckEmailResponseDto)
  async checkEmail(@Body() dto: CheckEmailDto) {
    const exists = await this.authService.checkEmailExists(dto.email);
    return { exists };
  }

  @Post('login')
  @ZodSerializerDto(LoginResponseDto)
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('register')
  @ZodSerializerDto(RegisterResponseDto)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register({
      email: dto.email,
      password: dto.password,
      name: `${dto.firstName} ${dto.lastName}`,
      clinicName: dto.clinicName,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ZodSerializerDto(ChangePasswordResponseDto)
  async changePassword(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    // Validation is now handled by ZodValidationPipe and ChangePasswordSchema
    return this.authService.changePassword({
      userId: req.user.sub,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('validate')
  @ZodSerializerDto(ValidateSessionResponseDto)
  validate(@Request() req: AuthenticatedRequest) {
    return {
      valid: true,
      user: {
        id: req.user.userId,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        clinicId: req.user.clinicId,
      },
    };
  }
}
