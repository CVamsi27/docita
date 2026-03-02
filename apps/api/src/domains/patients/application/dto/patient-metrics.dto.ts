import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMetricCategoryDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class CreateMetricOptionDto {
  @IsString()
  @IsNotEmpty()
  value!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class CreateMetricDefinitionDto {
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsString()
  @IsNotEmpty()
  valueType!: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  cardinality?: string;

  @IsString()
  @IsOptional()
  scope?: string;

  @IsOptional()
  @IsBoolean()
  isTrackedByDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isPatientScoped?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMetricOptionDto)
  options?: CreateMetricOptionDto[];
}

export class UpsertMetricSelectionDto {
  @IsString()
  @IsNotEmpty()
  definitionId!: string;

  @IsBoolean()
  isTracked!: boolean;
}

export class UpsertMetricSelectionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertMetricSelectionDto)
  items!: UpsertMetricSelectionDto[];
}

export class CreatePatientMetricValueDto {
  @IsString()
  @IsNotEmpty()
  definitionId!: string;

  @IsString()
  @IsOptional()
  appointmentId?: string;

  @IsDateString()
  @IsOptional()
  recordedAt?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  valueString?: string;

  @IsOptional()
  @IsNumber()
  valueNumber?: number;

  @IsOptional()
  @IsBoolean()
  valueBoolean?: boolean;

  @IsDateString()
  @IsOptional()
  valueDate?: string;

  @IsOptional()
  @IsObject()
  valueJson?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  optionId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionIds?: string[];
}

export class MetricHistoryQueryDto {
  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  definitionId?: string;

  @IsDateString()
  @IsOptional()
  from?: string;

  @IsDateString()
  @IsOptional()
  to?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
