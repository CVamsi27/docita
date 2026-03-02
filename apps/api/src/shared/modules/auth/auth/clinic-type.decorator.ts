import { SetMetadata } from '@nestjs/common';
import { ClinicType } from '@workspace/db';
import { FacilityType } from '@workspace/types';

export { ClinicType, FacilityType };

export const CLINIC_TYPES_KEY = 'requiredClinicTypes';

export const RequireClinicType = (...types: ClinicType[]) =>
  SetMetadata(CLINIC_TYPES_KEY, types);

export const FACILITY_TYPES_KEY = 'requiredFacilityTypes';

export const RequireFacilityType = (...types: FacilityType[]) =>
  SetMetadata(FACILITY_TYPES_KEY, types);
