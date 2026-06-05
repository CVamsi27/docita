import { SetMetadata } from '@nestjs/common';

export const LAB_PORTAL_SESSION_KEY = 'labPortalSession';

/** Route accepts lab-portal JWT audience (role LAB). */
export const LabPortalSession = () =>
  SetMetadata(LAB_PORTAL_SESSION_KEY, true);
