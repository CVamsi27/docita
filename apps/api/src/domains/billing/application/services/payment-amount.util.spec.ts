import { BadRequestException } from '@nestjs/common';
import { toPaiseAmount } from './payment-amount.util';

describe('toPaiseAmount', () => {
  it('converts whole rupee amount to paise', () => {
    expect(toPaiseAmount(100)).toBe(10000);
  });

  it('converts zero to paise', () => {
    expect(toPaiseAmount(0)).toBe(0);
  });

  it('converts amount with two decimal places', () => {
    expect(toPaiseAmount(99.99)).toBe(9999);
  });

  it('converts amount with one decimal place', () => {
    expect(toPaiseAmount(10.5)).toBe(1050);
  });

  it('throws for amount with more than two decimal places', () => {
    expect(() => toPaiseAmount(10.001)).toThrow(BadRequestException);
  });

  it('throws for negative amounts', () => {
    expect(() => toPaiseAmount(-1)).toThrow(BadRequestException);
  });

  it('throws for NaN', () => {
    expect(() => toPaiseAmount(NaN)).toThrow(BadRequestException);
  });

  it('throws for Infinity', () => {
    expect(() => toPaiseAmount(Infinity)).toThrow(BadRequestException);
  });

  it('throws for negative Infinity', () => {
    expect(() => toPaiseAmount(-Infinity)).toThrow(BadRequestException);
  });

  it('accepts large valid amounts', () => {
    expect(toPaiseAmount(999999.99)).toBe(99999999);
  });

  it('accepts amount with exactly two decimal places', () => {
    expect(toPaiseAmount(1.11)).toBe(111);
  });
});
