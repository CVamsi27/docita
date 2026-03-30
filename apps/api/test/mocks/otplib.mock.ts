export const generateSecret = jest.fn(() => 'TESTSECRETBASE32');
export const generateURI = jest.fn(
  () =>
    'otpauth://totp/Docita:test@example.com?secret=TESTSECRETBASE32&issuer=Docita',
);
export const verify = jest.fn(async () => ({ valid: true, delta: 0 }));
export const generate = jest.fn(async () => '123456');
export const generateSync = jest.fn(() => '123456');
export const verifySync = jest.fn(() => ({ valid: true, delta: 0 }));
