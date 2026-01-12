/**
 * Lab Test Business Rules
 * Test result interpretation and validation
 */

export interface LabTestResult {
    testName: string;
    value: number;
    unit: string;
    referenceMin?: number;
    referenceMax?: number;
    status?: "normal" | "low" | "high" | "critical";
}

export interface LabPanel {
    name: string;
    tests: string[];
    category: "hematology" | "chemistry" | "urinalysis" | "microbiology" | "other";
}

/**
 * Determine test result status based on reference range
 */
export function getTestResultStatus(result: LabTestResult): LabTestResult["status"] {
    if (result.referenceMin === undefined || result.referenceMax === undefined) {
        return undefined;
    }

    const { value, referenceMin, referenceMax } = result;

    // Critical thresholds (20% beyond normal range)
    const criticalLow = referenceMin - (referenceMax - referenceMin) * 0.2;
    const criticalHigh = referenceMax + (referenceMax - referenceMin) * 0.2;

    if (value <= criticalLow || value >= criticalHigh) {
        return "critical";
    }
    if (value < referenceMin) {
        return "low";
    }
    if (value > referenceMax) {
        return "high";
    }
    return "normal";
}

/**
 * Format lab value with unit
 */
export function formatLabValue(value: number, unit: string): string {
    const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(2);
    return `${formatted} ${unit}`;
}

/**
 * Get status color for display
 */
export function getStatusColor(status: LabTestResult["status"]): string {
    switch (status) {
        case "critical":
            return "text-red-600";
        case "high":
            return "text-amber-600";
        case "low":
            return "text-blue-600";
        case "normal":
            return "text-green-600";
        default:
            return "text-muted-foreground";
    }
}

/**
 * Check if any results are abnormal
 */
export function hasAbnormalResults(results: LabTestResult[]): boolean {
    return results.some(
        (r) => r.status === "high" || r.status === "low" || r.status === "critical"
    );
}

/**
 * Check if any results are critical
 */
export function hasCriticalResults(results: LabTestResult[]): boolean {
    return results.some((r) => r.status === "critical");
}

/**
 * Common lab panels
 */
export const COMMON_LAB_PANELS: LabPanel[] = [
    {
        name: "Complete Blood Count (CBC)",
        tests: ["WBC", "RBC", "Hemoglobin", "Hematocrit", "Platelets", "MCV", "MCH", "MCHC"],
        category: "hematology",
    },
    {
        name: "Basic Metabolic Panel (BMP)",
        tests: ["Glucose", "BUN", "Creatinine", "Sodium", "Potassium", "Chloride", "CO2"],
        category: "chemistry",
    },
    {
        name: "Comprehensive Metabolic Panel (CMP)",
        tests: [
            "Glucose", "BUN", "Creatinine", "Sodium", "Potassium", "Chloride", "CO2",
            "Calcium", "Total Protein", "Albumin", "Bilirubin", "ALP", "AST", "ALT",
        ],
        category: "chemistry",
    },
    {
        name: "Lipid Panel",
        tests: ["Total Cholesterol", "HDL", "LDL", "Triglycerides", "VLDL"],
        category: "chemistry",
    },
    {
        name: "Thyroid Panel",
        tests: ["TSH", "T4", "T3", "Free T4"],
        category: "chemistry",
    },
    {
        name: "Liver Function Tests (LFT)",
        tests: ["AST", "ALT", "ALP", "GGT", "Bilirubin", "Albumin", "Total Protein"],
        category: "chemistry",
    },
    {
        name: "Renal Function Tests",
        tests: ["BUN", "Creatinine", "eGFR", "BUN/Creatinine Ratio"],
        category: "chemistry",
    },
    {
        name: "Urinalysis",
        tests: ["pH", "Specific Gravity", "Protein", "Glucose", "Ketones", "Blood", "WBC"],
        category: "urinalysis",
    },
];
