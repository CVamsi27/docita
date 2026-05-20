import { ENCRYPTION_CONSTANTS } from './app-constants';

describe('ENCRYPTION_CONSTANTS', () => {
  it('pins the patient-data encryption algorithm', () => {
    expect(ENCRYPTION_CONSTANTS.ALGORITHM).toBe('aes-256-gcm');
    expect(ENCRYPTION_CONSTANTS.KEY_LENGTH).toBe(32);
    expect(ENCRYPTION_CONSTANTS.IV_LENGTH).toBe(16);
  });
});
