import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@workspace/db';
import PDFDocument from 'pdfkit';

interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
}

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(clinicId: string) {
    if (!clinicId) {
      return [];
    }
    return this.prisma.invoice.findMany({
      where: { patient: { clinicId } },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        appointment: {
          select: {
            id: true,
            doctor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
            address: true,
            clinic: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                email: true,
                logo: true,
              },
            },
          },
        },
        appointment: {
          select: {
            id: true,
            doctor: {
              select: {
                id: true,
                name: true,
                email: true,
                qualification: true,
                registrationNumber: true,
                signatureUrl: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return invoice;
  }

  async create(data: {
    appointmentId?: string;
    patientId: string;
    total: number;
    status: string;
    items: InvoiceItem[];
    // Doctor context for audit trail (Phase 5)
    doctorName?: string;
    doctorEmail?: string;
    doctorPhone?: string;
    doctorSpecialization?: any;
    doctorRole?: any;
    doctorRegistrationNumber?: string;
    doctorLicenseNumber?: string;
  }) {
    return this.prisma.invoice.create({
      data: {
        appointmentId: data.appointmentId,
        patientId: data.patientId,
        total: data.total,
        status: data.status,
        items: data.items as unknown as Prisma.InputJsonValue,
        // Save doctor context snapshot (Phase 5)
        doctorName: data.doctorName,
        doctorEmail: data.doctorEmail,
        doctorPhone: data.doctorPhone,
        doctorSpecialization: data.doctorSpecialization || null,
        doctorRole: data.doctorRole || null,
        doctorRegistrationNumber: data.doctorRegistrationNumber,
        doctorLicenseNumber: data.doctorLicenseNumber,
      },
      select: {
        id: true,
        appointmentId: true,
        patientId: true,
        total: true,
        status: true,
        items: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
      },
    });
  }

  async update(
    id: string,
    data: { status?: string; total?: number; items?: InvoiceItem[] },
  ) {
    return this.prisma.invoice.update({
      where: { id },
      data: {
        ...data,
        items: data.items
          ? (data.items as unknown as Prisma.InputJsonValue)
          : undefined,
      },
      select: {
        id: true,
        appointmentId: true,
        patientId: true,
        total: true,
        status: true,
        items: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
      },
    });
  }

  async generatePDF(id: string): Promise<Buffer> {
    const invoice = await this.findOne(id);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text(process.env.CLINIC_NAME || 'Docita Clinic', { align: 'center' });
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(
          process.env.CLINIC_ADDRESS || '123 Health Avenue, Medical District',
          { align: 'center' },
        );
      doc.text(process.env.CLINIC_CITY || 'Bangalore, Karnataka - 560001', {
        align: 'center',
      });
      doc.text(
        `Phone: ${process.env.CLINIC_PHONE || '+91 98765 43210'} | Email: ${process.env.CLINIC_EMAIL || 'contact@docita.com'}`,
        { align: 'center' },
      );
      doc.moveDown(2);

      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('INVOICE', { align: 'right' });
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Invoice #: ${invoice.id.slice(0, 8).toUpperCase()}`, {
          align: 'right',
        });
      doc.text(
        `Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        { align: 'right' },
      );
      doc.text(`Status: ${invoice.status.toUpperCase()}`, { align: 'right' });
      doc.moveDown();

      const startY = doc.y;

      doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', 50, startY);
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`${invoice.patient.firstName} ${invoice.patient.lastName}`);
      doc.text(`Phone: ${invoice.patient.phoneNumber}`);
      if (invoice.patient.email) doc.text(`Email: ${invoice.patient.email}`);
      if (invoice.patient.address)
        doc.text(`Address: ${invoice.patient.address}`);

      if (invoice.appointment?.doctor) {
        doc.fontSize(12).font('Helvetica-Bold').text('Doctor:', 350, startY);
        doc
          .fontSize(10)
          .font('Helvetica')
          .text(invoice.appointment.doctor.name);
        doc.text(`Email: ${invoice.appointment.doctor.email}`);
      }

      doc.moveDown(4);

      const tableTop = doc.y + 20;
      doc.font('Helvetica-Bold');
      doc.text('Description', 50, tableTop, { width: 250 });
      doc.text('Qty', 300, tableTop, { width: 50 });
      doc.text('Price', 350, tableTop, { width: 80 });
      doc.text('Amount', 430, tableTop, { width: 100, align: 'right' });

      doc
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();
      doc.font('Helvetica');
      doc.moveDown();

      let yPosition = tableTop + 25;
      const items = invoice.items as Array<{
        description: string;
        quantity: number;
        price: number;
      }>;

      items.forEach((item) => {
        doc.text(item.description, 50, yPosition, { width: 250 });
        doc.text(item.quantity.toString(), 300, yPosition, { width: 50 });
        doc.text(`₹${item.price.toFixed(2)}`, 350, yPosition, { width: 80 });
        doc.text(
          `₹${(item.quantity * item.price).toFixed(2)}`,
          430,
          yPosition,
          { width: 100, align: 'right' },
        );
        yPosition += 20;
      });

      // Total
      doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
      yPosition += 10;
      doc.fontSize(12).font('Helvetica-Bold').text('Total:', 350, yPosition);
      doc.text(`₹${invoice.total.toFixed(2)}`, 430, yPosition, {
        width: 100,
        align: 'right',
      });

      // Footer
      doc
        .fontSize(8)
        .font('Helvetica')
        .text(
          `Thank you for choosing ${process.env.CLINIC_NAME || 'Docita Clinic'}. Get well soon!`,
          50,
          doc.page.height - 50,
          { align: 'center' },
        );

      doc.end();
    });
  }
}
