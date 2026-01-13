export type EntityType =
    | "PATIENT"
    | "PRESCRIPTION"
    | "DOCTOR"
    | "LAB_TEST"
    | "INVENTORY";

export type BulkImportStep =
    | "select"
    | "download"
    | "upload"
    | "progress"
    | "result";

export const ENTITIES: EntityType[] = [
    "PATIENT",
    "PRESCRIPTION",
    "DOCTOR",
    "LAB_TEST",
    "INVENTORY",
];

export const STEPS: BulkImportStep[] = [
    "select",
    "download",
    "upload",
    "progress",
    "result",
];
