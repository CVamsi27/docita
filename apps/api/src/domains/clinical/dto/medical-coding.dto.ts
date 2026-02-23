import { z } from 'zod';

export const AddFavoriteDtoSchema = z.object({
  icdCodeId: z.string(),
});

export class AddFavoriteDto {
  icdCodeId: string;
}

export const AddCptFavoriteDtoSchema = z.object({
  cptCodeId: z.string(),
});

export class AddCptFavoriteDto {
  cptCodeId: string;
}

export interface IcdCodeListResponseDto {
  id: string;
  code: string;
  description: string;
  category: string;
}

export interface CptCodeListResponseDto {
  id: string;
  code: string;
  description: string;
  category: string;
}

export interface DoctorFavoriteCodeListResponseDto {
  icdCodes: IcdCodeListResponseDto[];
  cptCodes: CptCodeListResponseDto[];
}

export interface DoctorFavoriteCodeResponseDto {
  id: string;
  code: string;
  description: string;
  category: string;
}

export interface UncodedVisitListResponseDto {
  id: string;
  patientName: string;
  visitDate: Date;
  description: string;
}
