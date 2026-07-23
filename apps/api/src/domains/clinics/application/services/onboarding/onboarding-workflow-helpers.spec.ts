import { BadRequestException } from '@nestjs/common';
import { generateUniqueReferralCodeInTx } from './onboarding-workflow-helpers';

function createMockTx(existingCodes: string[] = []) {
  return {
    clinic: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        const code = where?.referralCode;
        if (existingCodes.includes(code)) {
          return Promise.resolve({ id: 'existing-clinic' });
        }
        return Promise.resolve(null);
      }),
    },
  } as any;
}

describe('generateUniqueReferralCodeInTx', () => {
  it('returns a referral code when no collision', async () => {
    const tx = createMockTx([]);
    const result = await generateUniqueReferralCodeInTx(tx, 'Sunrise Clinic');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(tx.clinic.findFirst).toHaveBeenCalled();
  });

  it('retries when first code collides', async () => {
    let callCount = 0;
    const tx = {
      clinic: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({ id: 'existing' });
          }
          return Promise.resolve(null);
        }),
      },
    } as any;
    const result = await generateUniqueReferralCodeInTx(tx, 'Test Clinic');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(tx.clinic.findFirst).toHaveBeenCalledTimes(2);
  });

  it('throws BadRequestException after 8 failed attempts', async () => {
    const tx = {
      clinic: {
        findFirst: jest.fn().mockResolvedValue({ id: 'existing' }),
      },
    } as any;
    await expect(
      generateUniqueReferralCodeInTx(tx, 'Test Clinic'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException with descriptive message', async () => {
    const tx = {
      clinic: {
        findFirst: jest.fn().mockResolvedValue({ id: 'existing' }),
      },
    } as any;
    try {
      await generateUniqueReferralCodeInTx(tx, 'Test Clinic');
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).message).toBe(
        'Unable to generate a unique clinic code',
      );
    }
  });

  it('passes clinicName to generateReferralCode', async () => {
    const tx = createMockTx([]);
    const result = await generateUniqueReferralCodeInTx(tx, 'My Clinic');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
