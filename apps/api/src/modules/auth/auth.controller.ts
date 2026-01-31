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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
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

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('check-email')
  @ApiOperation({ summary: 'Check if email exists' })
  @ApiResponse({ status: 200, description: 'Email check result' })
  @ZodSerializerDto(CheckEmailResponseDto)
  async checkEmail(@Body() dto: CheckEmailDto) {
    const exists = await this.authService.checkEmailExists(dto.email);
    return { exists };
  }

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ZodSerializerDto(LoginResponseDto)
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new user and clinic' })
  @ApiResponse({ status: 201, description: 'Successfully registered' })
  @ApiResponse({ status: 400, description: 'Validation error' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Validate current session' })
  @ApiResponse({ status: 200, description: 'Session is valid' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
