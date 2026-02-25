import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsDate,
} from 'class-validator';

export class CreateMedicalConditionDto {
  @IsString()
  @IsNotEmpty()
  conditionName!: string;

  @IsString()
  @IsOptional()
  icdCode?: string;

  @IsString()
  @IsOptional()
  conditionType?: string;

  @IsString()
  @IsNotEmpty()
  status!: string;

  @IsString()
  @IsOptional()
  severity?: string;

  @IsOptional()
  diagnosedDate?: Date;

  @IsOptional()
  resolvedDate?: Date;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  diagnosedBy?: string;
}

export class CreateAllergyDto {
  @IsString()
  @IsNotEmpty()
  allergen!: string;

  @IsString()
  @IsOptional()
  allergyType?: string;

  @IsString()
  @IsOptional()
  severity?: string;

  @IsString()
  @IsOptional()
  reaction?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  onsetDate?: Date;
}

export class CreateFamilyHistoryDto {
  @IsString()
  @IsNotEmpty()
  relationship!: string;

  @IsString()
  @IsNotEmpty()
  condition!: string;

  @IsOptional()
  ageAtOnset?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateSocialHistoryDto {
  @IsString()
  @IsOptional()
  smokingStatus?: string;

  @IsOptional()
  @IsOptional()
  smokingPackYears?: number;

  @IsOptional()
  smokingQuitDate?: Date;

  @IsString()
  @IsOptional()
  alcoholUse?: string;

  @IsString()
  @IsOptional()
  alcoholFrequency?: string;

  @IsString()
  @IsOptional()
  substanceUse?: string;

  @IsString()
  @IsOptional()
  occupation?: string;

  @IsString()
  @IsOptional()
  occupationalHazards?: string;

  @IsString()
  @IsOptional()
  exerciseFrequency?: string;

  @IsString()
  @IsOptional()
  dietaryRestrictions?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateSurgicalHistoryDto {
  @IsString()
  @IsNotEmpty()
  procedureName!: string;

  @IsOptional()
  procedureDate?: Date;

  @IsString()
  @IsOptional()
  hospital?: string;

  @IsString()
  @IsOptional()
  surgeon?: string;

  @IsString()
  @IsOptional()
  complications?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
