import { z } from "zod";

export const icdCodeSchema = z.object({
    id: z.string(),
    code: z.string(),
    description: z.string(),
    isCommon: z.boolean(),
    createdAt: z.date().or(z.string()),
    updatedAt: z.date().or(z.string()),
});

export const cptCodeSchema = z.object({
    id: z.string(),
    code: z.string(),
    description: z.string(),
    isCommon: z.boolean(),
    createdAt: z.date().or(z.string()),
    updatedAt: z.date().or(z.string()),
});

export const doctorFavoriteCodeSchema = z.object({
    id: z.string(),
    userId: z.string(),
    icdCodeId: z.string().nullable().optional(),
    cptCodeId: z.string().nullable().optional(),
    createdAt: z.date().or(z.string()),
    updatedAt: z.date().or(z.string()),
    icdCode: icdCodeSchema.nullable().optional(),
    cptCode: cptCodeSchema.nullable().optional(),
});

export type IcdCode = z.infer<typeof icdCodeSchema>;
export type CptCode = z.infer<typeof cptCodeSchema>;
export type DoctorFavoriteCode = z.infer<typeof doctorFavoriteCodeSchema>;

export type IcdFavorite = DoctorFavoriteCode;
export type CptFavorite = DoctorFavoriteCode;
