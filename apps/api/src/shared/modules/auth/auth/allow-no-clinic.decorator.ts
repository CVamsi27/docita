import { SetMetadata } from '@nestjs/common';

export const ALLOW_NO_CLINIC_KEY = 'allowNoClinic';
export const AllowNoClinic = () => SetMetadata(ALLOW_NO_CLINIC_KEY, true);
