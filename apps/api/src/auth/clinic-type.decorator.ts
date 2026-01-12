import { SetMetadata } from '@nestjs/common';
import { ClinicType } from '@workspace/db';
import { FacilityType } from '@workspace/types';

// Re-export for convenience
export { ClinicType, FacilityType };

// ============================================================================
// Clinic Type Decorator
// ============================================================================

export const CLINIC_TYPES_KEY = 'requiredClinicTypes';

/**
 * Decorator to require specific clinic types for an endpoint
 *
 * @example
 * // Only allow DENTAL clinics
 * @RequireClinicType(ClinicType.DENTAL)
 *
 * @example
 * // Allow multiple clinic types
 * @RequireClinicType(ClinicType.DENTAL, ClinicType.GENERAL)
 */
export const RequireClinicType = (...types: ClinicType[]) =>
  SetMetadata(CLINIC_TYPES_KEY, types);

// ============================================================================
// Facility Type Decorator
// ============================================================================

export const FACILITY_TYPES_KEY = 'requiredFacilityTypes';

/**
 * Decorator to require specific facility types for an endpoint
 *
 * @example
 * // Only allow HOSPITAL facilities
 * @RequireFacilityType(FacilityType.HOSPITAL)
 *
 * @example
 * // Allow both types
 * @RequireFacilityType(FacilityType.CLINIC, FacilityType.HOSPITAL)
 */
export const RequireFacilityType = (...types: FacilityType[]) =>
  SetMetadata(FACILITY_TYPES_KEY, types);
