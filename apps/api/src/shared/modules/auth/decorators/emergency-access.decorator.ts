import { SetMetadata } from '@nestjs/common';

export const EMERGENCY_ACCESS_KEY = 'emergency_access';

export const EmergencyAccess = () => SetMetadata(EMERGENCY_ACCESS_KEY, true);
