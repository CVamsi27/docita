import { SetMetadata } from '@nestjs/common';

export const EMERGENCY_ACCESS_KEY = 'emergency_access';

/**
 * Decorator to mark an endpoint as eligible for "Break-the-Glass" (BTG) emergency access.
 * When a request includes the 'x-break-the-glass' header and this decorator is present,
 * tenant isolation may be bypassed for this specific request, with mandatory high-priority auditing.
 */
export const EmergencyAccess = () => SetMetadata(EMERGENCY_ACCESS_KEY, true);
