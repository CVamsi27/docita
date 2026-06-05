-- Setup fees are optional contract terms and can be invoiced on demand.
ALTER TYPE "EnterpriseInvoiceKind" ADD VALUE IF NOT EXISTS 'SETUP_FEE';
