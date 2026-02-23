import { z } from 'zod';

export const AddFavoriteDtoSchema = z.object({
  icdCodeId: z.string(),
});

export class AddFavoriteDto {
  icdCodeId!: string;
}

export const AddCptFavoriteDtoSchema = z.object({
  cptCodeId: z.string(),
});

export class AddCptFavoriteDto {
  cptCodeId!: string;
}

export interface IcdCodeListResponseDto {
  id: string;
  code: string;
  description: string;
  category: string;
}

export const IcdCodeListResponseDtoSchema = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string(),
  category: z.string(),
});

export interface CptCodeListResponseDto {
  id: string;
  code: string;
  description: string;
  category: string;
}

export const CptCodeListResponseDtoSchema = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string(),
  category: z.string(),
});

export interface DoctorFavoriteCodeListResponseDto {
  icdCodes: IcdCodeListResponseDto[];
  cptCodes: CptCodeListResponseDto[];
}

export const DoctorFavoriteCodeListResponseDtoSchema = z.object({
  icdCodes: z.array(IcdCodeListResponseDtoSchema),
  cptCodes: z.array(CptCodeListResponseDtoSchema),
});

export interface DoctorFavoriteCodeResponseDto {
  id: string;
  code: string;
  description: string;
  category: string;
}

export const DoctorFavoriteCodeResponseDtoSchema = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string(),
  category: z.string(),
});

export interface UncodedVisitListResponseDto {
  id: string;
  patientName: string;
  visitDate: Date;
  description: string;
}

export const UncodedVisitListResponseDtoSchema = z.object({
  id: z.string(),
  patientName: z.string(),
  visitDate: z.date(),
  description: z.string(),
});
