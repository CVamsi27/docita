import {
  IsOptional,
  IsString,
  IsEmail,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// Get Patient Dashboard Snapshot
// ============================================================================

export class GetPatientPortalSnapshotQueryDto {}

// ============================================================================
// Update Patient Profile
// ============================================================================

export class UpdatePatientProfileBodyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  whatsappConsent?: boolean;
}

// ============================================================================
// Request Appointment
// ============================================================================

export class RequestAppointmentBodyDto {
  @ApiProperty()
  @IsDateString()
  preferredDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preferredDoctorId?: string;

  @ApiProperty()
  @IsString()
  reason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================================================
// Get Patient Appointments (same filters as existing)
// ============================================================================

export class GetPatientAppointmentsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

// ============================================================================
// Get Patient Prescriptions
// ============================================================================

export class GetPatientPrescriptionsQueryDto {
  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

// ============================================================================
// Get Patient Invoices
// ============================================================================

export class GetPatientInvoicesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

// ============================================================================
// Request Data Deletion (GDPR/DPDP Compliance)
// ============================================================================

export class RequestDataDeletionDto {
  @ApiProperty()
  @IsString()
  reason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  confirmDeletion?: boolean;
}

// ============================================================================
// Update Consent Settings
// ============================================================================

export class UpdateConsentSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  whatsappConsent?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  dataStorageConsent?: boolean;
}
