import { PDFContext } from '@/shared/modules/document-generation/pdf/base-pdf.service';
import { fetchWithTimeout } from '@/shared/common/http/fetch-with-timeout';
import { assertSafeExternalUrl } from '@/shared/common/http/safe-external-url';
import { PDFInvoiceItem, type InvoiceTaxSummary } from '@workspace/types';
import PDFDocument from 'pdfkit';
import { InvoicePdfRenderData } from './invoice-pdf-data.types';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PAID: { bg: '#dcfce7', text: '#166534' },
  PENDING: { bg: '#fef9c3', text: '#854d0e' },
  OVERDUE: { bg: '#fee2e2', text: '#991b1b' },
};

/**
 * Shared callback shapes threaded through the section renderers below.
 * Extracted because every renderer needs the same page-break check and
 * divider draw — keeping a single alias means the contract only needs to
 * change in one place if `BasePdfService` ever evolves it.
 */
type CheckPageBreakFn = (
  doc: typeof PDFDocument.prototype,
  y: number,
  needed: number,
  ctx: PDFContext,
) => number;

type DrawDividerFn = (
  doc: typeof PDFDocument.prototype,
  y: number,
  ctx: PDFContext,
) => void;

export function renderStatusBadge(
  doc: typeof PDFDocument.prototype,
  status: string,
  context: PDFContext,
  currentY: number,
): number {
  const colors = STATUS_COLORS[status.toUpperCase()] ?? {
    bg: '#f3f4f6',
    text: '#374151',
  };
  const badgeW = 90;
  const badgeH = 22;
  const badgeX = context.margin + context.contentWidth - badgeW;

  doc.rect(badgeX, currentY, badgeW, badgeH).fill(colors.bg);
  doc
    .fillColor(colors.text)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(status.toUpperCase(), badgeX, currentY + 5, {
      width: badgeW,
      align: 'center',
    });
  doc.fillColor('#000000');

  return currentY + 30;
}

interface ColumnDef {
  width: number;
  header: string;
  align: 'left' | 'center' | 'right';
  renderCell: (item: PDFInvoiceItem, sym: string) => string;
}

function getItemColumns(hasCpt: boolean, sym: string): ColumnDef[] {
  if (hasCpt) {
    return [
      {
        width: 160,
        header: 'Description',
        align: 'left',
        renderCell: (i) => i.description,
      },
      {
        width: 55,
        header: 'CPT Code',
        align: 'center',
        renderCell: (i) => i.cptCode ?? '—',
      },
      {
        width: 45,
        header: 'Qty',
        align: 'center',
        renderCell: (i) => i.quantity.toString(),
      },
      {
        width: 65,
        header: 'Price',
        align: 'right',
        renderCell: (i) => `${sym}${i.unitPrice.toFixed(2)}`,
      },
      {
        width: 55,
        header: 'GST',
        align: 'right',
        renderCell: (i) => `${i.gstRate ?? 0}%`,
      },
      {
        width: 75,
        header: 'Amount',
        align: 'right',
        renderCell: (i) => `${sym}${i.amount.toFixed(2)}`,
      },
    ];
  }
  return [
    {
      width: 200,
      header: 'Description',
      align: 'left',
      renderCell: (i) => i.description,
    },
    {
      width: 50,
      header: 'Qty',
      align: 'center',
      renderCell: (i) => i.quantity.toString(),
    },
    {
      width: 70,
      header: 'Price',
      align: 'right',
      renderCell: (i) => `${sym}${i.unitPrice.toFixed(2)}`,
    },
    {
      width: 70,
      header: 'GST',
      align: 'right',
      renderCell: (i) => `${i.gstRate ?? 0}%`,
    },
    {
      width: 80,
      header: 'Amount',
      align: 'right',
      renderCell: (i) => `${sym}${i.amount.toFixed(2)}`,
    },
  ];
}

function renderRow(
  doc: typeof PDFDocument.prototype,
  columns: ColumnDef[],
  startX: number,
  y: number,
  renderFirst: (col: ColumnDef, x: number, w: number) => void,
  renderOther: (col: ColumnDef, x: number) => void,
): void {
  let x = startX;
  columns.forEach((col, i) => {
    if (i === 0) {
      renderFirst(col, x + 4, col.width);
    } else {
      renderOther(col, x);
    }
    x += col.width;
  });
}

export function renderItemsTable(
  doc: typeof PDFDocument.prototype,
  items: PDFInvoiceItem[],
  context: PDFContext,
  startY: number,
  checkPageBreak: CheckPageBreakFn,
  drawDivider: DrawDividerFn,
): number {
  const hasCpt = items.some((item) => item.cptCode);
  let currentY = startY;
  const startX = context.margin;
  const columns = getItemColumns(hasCpt, context.currencySymbol);
  const totalW = columns.reduce((a, b) => a + b.width, 0);

  doc.rect(startX, currentY - 4, totalW, 22).fill(context.theme.primaryColor);
  doc
    .fillColor(context.theme.primaryTextColor)
    .fontSize(9)
    .font('Helvetica-Bold');

  renderRow(
    doc,
    columns,
    startX,
    currentY + 2,
    (col, x, w) => doc.text(col.header, x, currentY + 2, { width: w }),
    (col, x) =>
      doc.text(col.header, x, currentY + 2, {
        width: col.width,
        align: col.align,
      }),
  );

  doc.fillColor('#000000');
  currentY += 24;
  doc.font('Helvetica').fontSize(9);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    currentY = checkPageBreak(doc, currentY, 20, context);

    if (i % 2 === 0) {
      doc
        .rect(startX, currentY - 2, totalW, 18)
        .fill(context.theme.altRowColor);
    }

    doc.fillColor('#111827');

    renderRow(
      doc,
      columns,
      startX,
      currentY,
      (col, x, w) =>
        doc.text(col.renderCell(item, context.currencySymbol), x, currentY, {
          width: w - 4,
        }),
      (col, x) =>
        doc.text(col.renderCell(item, context.currencySymbol), x, currentY, {
          width: col.width,
          align: col.align,
        }),
    );

    doc.fillColor('#000000');
    currentY += 15;
    drawDivider(doc, currentY, context);
    currentY += 10;
  }

  return currentY;
}

export function renderTaxMetadata(
  doc: typeof PDFDocument.prototype,
  data: InvoicePdfRenderData,
  context: PDFContext,
  startY: number,
  checkPageBreak: CheckPageBreakFn,
  drawDivider: DrawDividerFn,
): number {
  const summary = data.taxSummary;
  if (!summary) return startY;

  let currentY = checkPageBreak(doc, startY, 42, context);
  const place = summary.placeOfSupply;
  const details = [
    place?.stateName || place?.stateCode
      ? `Place of supply: ${place.stateName ?? place.stateCode}`
      : undefined,
    data.sellerTaxSnapshot?.registrationId
      ? `${data.sellerTaxSnapshot.registrationLabel || 'GSTIN'}: ${
          data.sellerTaxSnapshot.registrationId
        }`
      : undefined,
    data.buyerTaxSnapshot?.registrationId
      ? `Buyer ${
          data.buyerTaxSnapshot.registrationLabel || 'GSTIN'
        }: ${data.buyerTaxSnapshot.registrationId}`
      : undefined,
    summary.reverseCharge ? 'Reverse charge: Yes' : undefined,
  ].filter((detail): detail is string => Boolean(detail));

  if (details.length === 0) return currentY;

  doc.font('Helvetica').fontSize(8).fillColor('#374151');
  doc.text(details.join(' | '), context.margin, currentY, {
    width: context.contentWidth,
  });
  doc.fillColor('#000000');

  currentY += 18;
  drawDivider(doc, currentY, context);
  return currentY + 10;
}

export function renderTotals(
  doc: typeof PDFDocument.prototype,
  items: PDFInvoiceItem[],
  context: PDFContext,
  startY: number,
  checkPageBreak: CheckPageBreakFn,
  taxSummary?: InvoiceTaxSummary,
): number {
  const subtotal =
    taxSummary?.subtotal ??
    items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discount = taxSummary?.discountTotal ?? 0;
  const tax = taxSummary?.taxTotal ?? 0;
  const total =
    taxSummary?.grandTotal ?? items.reduce((sum, item) => sum + item.amount, 0);

  let currentY = startY + 10;
  const labelX = context.margin + context.contentWidth - 200;
  const valueX = labelX + 95;
  const rowW = 205;
  const sym = context.currencySymbol;

  currentY = checkPageBreak(doc, currentY, 90, context);

  doc.font('Helvetica').fontSize(9).fillColor('#374151');
  doc.text('Subtotal:', labelX, currentY, { width: 90, align: 'right' });
  doc.text(`${sym}${subtotal.toFixed(2)}`, valueX, currentY, {
    width: 105,
    align: 'right',
  });
  currentY += 15;

  if (discount > 0) {
    doc.text('Discount:', labelX, currentY, { width: 90, align: 'right' });
    doc.text(`-${sym}${discount.toFixed(2)}`, valueX, currentY, {
      width: 105,
      align: 'right',
    });
    currentY += 15;
  }

  if (taxSummary?.taxableAmount) {
    doc.text('Taxable:', labelX, currentY, { width: 90, align: 'right' });
    doc.text(`${sym}${taxSummary.taxableAmount.toFixed(2)}`, valueX, currentY, {
      width: 105,
      align: 'right',
    });
    currentY += 15;
  }

  if (taxSummary?.components.length) {
    for (const component of taxSummary.components) {
      const label = `${component.type} ${component.rate}%:`;
      doc.text(label, labelX, currentY, { width: 90, align: 'right' });
      doc.text(`${sym}${component.amount.toFixed(2)}`, valueX, currentY, {
        width: 105,
        align: 'right',
      });
      currentY += 15;
    }
  } else {
    doc.text('Tax:', labelX, currentY, { width: 90, align: 'right' });
    doc.text(`${sym}${tax.toFixed(2)}`, valueX, currentY, {
      width: 105,
      align: 'right',
    });
    currentY += 15;
  }

  currentY += 3;

  doc
    .rect(labelX - 10, currentY - 5, rowW, 26)
    .fill(context.theme.primaryColor);
  doc
    .fillColor(context.theme.primaryTextColor)
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('Total:', labelX, currentY + 3, { width: 90, align: 'right' });
  doc.text(`${sym}${total.toFixed(2)}`, valueX, currentY + 3, {
    width: 105,
    align: 'right',
  });
  doc.fillColor('#000000');

  return currentY + 40;
}
export async function renderAuthorizedSignature(
  doc: typeof PDFDocument.prototype,
  data: InvoicePdfRenderData,
  context: PDFContext,
  startY: number,
  checkPageBreak: CheckPageBreakFn,
  fetchSignatureImage: (url: string) => Promise<Buffer>,
): Promise<number> {
  let currentY = checkPageBreak(doc, startY + 10, 95, context);
  const signatureX = context.margin + context.contentWidth - 190;
  const label = data.authorizedSignatureLabel || 'Authorized Signature';
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor('#374151')
    .text(label, signatureX, currentY);
  doc.fillColor('#000000');
  currentY += 12;
  if (data.authorizedSignatureUrl) {
    try {
      const signatureBuffer = await fetchSignatureImage(
        data.authorizedSignatureUrl,
      );
      doc.image(signatureBuffer, signatureX, currentY, {
        fit: [170, 45],
        align: 'left',
      });
      currentY += 50;
    } catch {
      doc
        .font('Helvetica-Oblique')
        .fontSize(8)
        .fillColor('#6b7280')
        .text('[Signature on file]', signatureX, currentY);
      doc.fillColor('#000000');
      currentY += 16;
    }
  } else {
    doc
      .font('Helvetica-Oblique')
      .fontSize(8)
      .fillColor('#9ca3af')
      .text('[No signature uploaded]', signatureX, currentY);
    doc.fillColor('#000000');
    currentY += 16;
  }
  doc
    .strokeColor('#94a3b8')
    .lineWidth(0.5)
    .moveTo(signatureX, currentY + 8)
    .lineTo(signatureX + 170, currentY + 8)
    .stroke()
    .strokeColor('#000000')
    .lineWidth(1);
  return currentY + 20;
}
export async function fetchSignatureImage(url: string): Promise<Buffer> {
  // SSRF gate — see safe-external-url.ts.
  const safeUrl = assertSafeExternalUrl(url);
  const response = await fetchWithTimeout(safeUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch signature: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
