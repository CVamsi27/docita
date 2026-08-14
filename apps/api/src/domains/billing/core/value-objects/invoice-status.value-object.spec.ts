import { describe, expect, it } from '@jest/globals';
import {
  InvoiceStatus,
  InvoiceStatusEnum,
} from './invoice-status.value-object';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';

const status = (value: InvoiceStatusEnum) => new InvoiceStatus(value);

describe('InvoiceStatus', () => {
  describe('canTransitionTo', () => {
    it('allows PENDING → PAID / PARTIALLY_PAID / OVERDUE / CANCELLED', () => {
      const pending = status(InvoiceStatusEnum.PENDING);
      expect(pending.canTransitionTo(InvoiceStatusEnum.PAID)).toBe(true);
      expect(pending.canTransitionTo(InvoiceStatusEnum.PARTIALLY_PAID)).toBe(
        true,
      );
      expect(pending.canTransitionTo(InvoiceStatusEnum.CANCELLED)).toBe(true);
    });

    it('allows PARTIALLY_PAID → PAID / OVERDUE only', () => {
      const partial = status(InvoiceStatusEnum.PARTIALLY_PAID);
      expect(partial.canTransitionTo(InvoiceStatusEnum.PAID)).toBe(true);
      expect(partial.canTransitionTo(InvoiceStatusEnum.CANCELLED)).toBe(false);
    });

    it('treats PAID and CANCELLED as terminal', () => {
      expect(
        status(InvoiceStatusEnum.PAID).canTransitionTo(
          InvoiceStatusEnum.OVERDUE,
        ),
      ).toBe(false);
      expect(
        status(InvoiceStatusEnum.CANCELLED).canTransitionTo(
          InvoiceStatusEnum.PAID,
        ),
      ).toBe(false);
    });
  });

  describe('transitionTo', () => {
    it('returns the next status on a legal transition', () => {
      const next = status(InvoiceStatusEnum.PENDING).transitionTo(
        InvoiceStatusEnum.PAID,
      );
      expect(next.value).toBe(InvoiceStatusEnum.PAID);
    });
    it('throws on an illegal transition', () => {
      expect(() =>
        status(InvoiceStatusEnum.PAID).transitionTo(InvoiceStatusEnum.PENDING),
      ).toThrow(InvariantViolationError);
    });
  });

  it('equals compares the underlying value', () => {
    expect(
      status(InvoiceStatusEnum.PAID).equals(status(InvoiceStatusEnum.PAID)),
    ).toBe(true);
    expect(
      status(InvoiceStatusEnum.PAID).equals(status(InvoiceStatusEnum.PENDING)),
    ).toBe(false);
  });

  it('exposes status predicates', () => {
    expect(status(InvoiceStatusEnum.PAID).isPaid()).toBe(true);
    expect(status(InvoiceStatusEnum.OVERDUE).isOverdue()).toBe(true);
    expect(status(InvoiceStatusEnum.CANCELLED).isCancelled()).toBe(true);
    expect(status(InvoiceStatusEnum.PENDING).isPending()).toBe(true);
    expect(status(InvoiceStatusEnum.PAID).isPending()).toBe(false);
  });
});
