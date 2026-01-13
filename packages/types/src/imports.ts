import { z } from "zod";

export const ImportJobType = z.enum([
    "EXCEL_PATIENTS",
    "EXCEL_APPOINTMENTS",
    "OCR_DOCUMENT",
    "BULK_SCAN"
]);

export const ImportJobStatus = z.enum([
    "PENDING",
    "PROCESSING",
    "COMPLETED",
    "FAILED",
    "PARTIALLY_COMPLETED"
]);

export const importJobSchema = z.object({
    id: z.string(),
    clinicId: z.string(),
    type: z.string().or(ImportJobType),
    status: z.string().or(ImportJobStatus),
    fileName: z.string().nullable().optional(),
    fileUrl: z.string().nullable().optional(),
    columnMapping: z.any().optional(), // Json
    totalRecords: z.number().int(),
    processed: z.number().int(),
    successful: z.number().int(),
    failed: z.number().int(),
    errors: z.any().optional(), // Json
    results: z.any().optional(), // Json
    createdAt: z.date().or(z.string()).optional(),
    updatedAt: z.date().or(z.string()).optional(),
});

export const bulkImportJobSchema = z.object({
    id: z.string(),
    clinicId: z.string(),
    userId: z.string(),
    entityType: z.string(),
    fileName: z.string(),
    fileSize: z.number().int(),
    originalKey: z.string(),
    status: z.string(),
    totalRows: z.number().int(),
    processedRows: z.number().int(),
    successRows: z.number().int(),
    failedRows: z.number().int(),
    createdAt: z.date().or(z.string()).optional(),
    updatedAt: z.date().or(z.string()).optional(),
    startedAt: z.date().or(z.string()).nullable().optional(),
    completedAt: z.date().or(z.string()).nullable().optional(),
    createdBy: z.string().optional(),
});

export type ImportJob = z.infer<typeof importJobSchema>;
export type BulkImportJob = z.infer<typeof bulkImportJobSchema>;
