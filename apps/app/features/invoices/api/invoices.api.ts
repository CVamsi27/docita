import { getAllInvoices, getInvoiceById } from "./invoice-list.api";
import {
  createInvoice,
  printInvoice,
  updateInvoice,
} from "./invoice-mutations.api";
import {
  enqueueInvoicePdf,
  getInvoicePdfStatus,
} from "./invoice-pdf.api";

export const invoicesApi = {
  getAll: getAllInvoices,
  getById: getInvoiceById,
  create: createInvoice,
  update: updateInvoice,
  print: printInvoice,
  enqueuePdf: enqueueInvoicePdf,
  getPdfStatus: getInvoicePdfStatus,
};
