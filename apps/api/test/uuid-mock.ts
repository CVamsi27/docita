import { randomUUID } from 'crypto';

export const v4 = () => randomUUID();
export const v1 = () => randomUUID();
export const v3 = () => randomUUID();
export const v5 = () => randomUUID();
export const validate = () => true;

export default { v4, v1, v3, v5, validate };
