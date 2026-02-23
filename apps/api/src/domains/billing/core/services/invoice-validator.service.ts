/**
 * Invoice Validator Service - Validates invoice business rules
 */

import { Invoice } from '../entities/invoice.entity';
import { InvoiceItem } from '../entities/invoice-item.entity';

export class InvoiceValidatorService {
  validateInvoice(invoice: Invoice): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check items
    const items = invoice.getItems();
    if (items.length === 0) {
      errors.push('Invoice must have at least one item');
    }

    items.forEach((item, index) => {
      const itemErrors = this.validateInvoiceItem(item);
      if (itemErrors.length > 0) {
        errors.push(`Item ${index + 1}: ${itemErrors.join(', ')}`);
      }
    });

    // Check dates
    if (invoice.issueDate > invoice.dueDate) {
      errors.push('Issue date must be before due date');
    }

    // Check total
    try {
      const total = invoice.getTotal();
      if (total.amount <= 0) {
        errors.push('Invoice total must be greater than 0');
      }
    } catch (error) {
      errors.push(`Error calculating total: ${(error as Error).message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  validateInvoiceItem(item: InvoiceItem): string[] {
    const errors: string[] = [];

    if (item.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    if (!item.description || item.description.trim().length === 0) {
      errors.push('Description is required');
    }

    if (item.taxRate < 0 || item.taxRate > 100) {
      errors.push('Tax rate must be between 0 and 100');
    }

    if (item.discount < 0 || item.discount > 100) {
      errors.push('Discount must be between 0 and 100');
    }

    return errors;
  }

  validateCanIssueInvoice(invoice: Invoice): {
    canIssue: boolean;
    errors: string[];
  } {
    const validation = this.validateInvoice(invoice);

    if (!invoice.canBeEdited()) {
      validation.errors.push(
        `Invoice cannot be issued from status: ${invoice.getStatus()}`,
      );
    }

    return {
      canIssue: validation.valid && validation.errors.length === 0,
      errors: validation.errors,
    };
  }
}
