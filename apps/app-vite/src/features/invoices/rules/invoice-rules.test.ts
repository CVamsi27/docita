import { describe, expect, it } from "vitest";
import {
  calculateTax,
  calculateTotal,
  calculateInvoiceTotals,
  canEditInvoice,
  isInvoiceOverdue,
  validateInvoiceItems,
} from "./invoice-rules";

describe("Invoice Business Rules", () => {
  describe("calculateTax", () => {
    it("should calculate tax correctly", () => {
      expect(calculateTax(100, 10)).toBe(10);
      expect(calculateTax(200, 5)).toBe(10);
      expect(calculateTax(100, 0)).toBe(0);
    });

    it("should use default tax rate of 0", () => {
      expect(calculateTax(100)).toBe(0);
    });
  });

  describe("calculateTotal", () => {
    it("should calculate total with tax and discount", () => {
      expect(calculateTotal(100, 10, 5)).toBe(105);
    });

    it("should calculate total without discount", () => {
      expect(calculateTotal(100, 10)).toBe(110);
    });

    it("should calculate total without tax or discount", () => {
      expect(calculateTotal(100)).toBe(100);
    });
  });

  describe("calculateInvoiceTotals", () => {
    it("keeps healthcare lines exempt by default", () => {
      const totals = calculateInvoiceTotals([{ quantity: 1, price: 500 }]);

      expect(totals.subtotal).toBe(500);
      expect(totals.taxTotal).toBe(0);
      expect(totals.exemptAmount).toBe(500);
      expect(totals.grandTotal).toBe(500);
    });

    it("calculates GST for taxable line previews", () => {
      const totals = calculateInvoiceTotals([
        {
          quantity: 1,
          price: 1000,
          taxTreatment: "TAXABLE",
          taxRate: 18,
        },
      ]);

      expect(totals.taxableAmount).toBe(1000);
      expect(totals.taxTotal).toBe(180);
      expect(totals.grandTotal).toBe(1180);
    });
  });

  describe("isInvoiceOverdue", () => {
    it("should return false for paid invoices", () => {
      const invoice = { status: "PAID", dueDate: new Date().toISOString() };
      expect(isInvoiceOverdue(invoice)).toBe(false);
    });

    it("should return false if due date is missing", () => {
      const invoice = { status: "PENDING" };
      expect(isInvoiceOverdue(invoice)).toBe(false);
    });

    it("should return true for past due dates", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const invoice = { status: "PENDING", dueDate: pastDate.toISOString() };
      expect(isInvoiceOverdue(invoice)).toBe(true);
    });

    it("should return false for future due dates", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const invoice = { status: "PENDING", dueDate: futureDate.toISOString() };
      expect(isInvoiceOverdue(invoice)).toBe(false);
    });
  });

  describe("canEditInvoice", () => {
    it("should allow editing draft or pending invoices", () => {
      expect(canEditInvoice({ status: "draft" })).toBe(true);
      expect(canEditInvoice({ status: "PENDING" })).toBe(true);
    });

    it("should NOT allow editing paid or cancelled invoices", () => {
      expect(canEditInvoice({ status: "PAID" })).toBe(false);
      expect(canEditInvoice({ status: "CANCELLED" })).toBe(false);
    });
  });

  describe("validateInvoiceItems", () => {
    it("should return true for valid items", () => {
      const items = [
        { description: "Item 1", quantity: 1, unitPrice: 10 },
        { description: "Item 2", quantity: 2, unitPrice: 20 },
      ];
      expect(validateInvoiceItems(items)).toBe(true);
    });

    it("should return false if description is missing", () => {
      const items = [{ quantity: 1, unitPrice: 10 }];
      expect(validateInvoiceItems(items)).toBe(false);
    });

    it("should return false if quantity is 0 or negative", () => {
      expect(
        validateInvoiceItems([
          { description: "A", quantity: 0, unitPrice: 10 },
        ]),
      ).toBe(false);
      expect(
        validateInvoiceItems([
          { description: "A", quantity: -1, unitPrice: 10 },
        ]),
      ).toBe(false);
    });

    it("should return false if unitPrice is negative", () => {
      expect(
        validateInvoiceItems([
          { description: "A", quantity: 1, unitPrice: -10 },
        ]),
      ).toBe(false);
    });
  });
});
