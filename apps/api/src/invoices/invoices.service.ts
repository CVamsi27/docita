import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';

@Injectable()
export class InvoicesService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.invoice.findMany({
            include: {
                patient: true,
                appointment: {
                    include: {
                        doctor: true,
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
                patient: true,
                appointment: {
                    include: {
                        doctor: true,
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
        items: Array<{ description: string; quantity: number; price: number }>;
    }) {
        return this.prisma.invoice.create({
            data: {
                appointmentId: data.appointmentId,
                patientId: data.patientId,
                total: data.total,
                status: data.status,
                items: data.items,
            },
            include: {
                patient: true,
            },
        });
    }

    async update(id: string, data: { status?: string; total?: number; items?: any }) {
        return this.prisma.invoice.update({
            where: { id },
            data,
            include: {
                patient: true,
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

            // Hospital Header
            doc.fontSize(24).font('Helvetica-Bold').text(process.env.CLINIC_NAME || 'Docita Clinic', { align: 'center' });
            doc.fontSize(10).font('Helvetica').text(process.env.CLINIC_ADDRESS || '123 Health Avenue, Medical District', { align: 'center' });
            doc.text(process.env.CLINIC_CITY || 'Bangalore, Karnataka - 560001', { align: 'center' });
            doc.text(`Phone: ${process.env.CLINIC_PHONE || '+91 98765 43210'} | Email: ${process.env.CLINIC_EMAIL || 'contact@docita.com'}`, { align: 'center' });
            doc.moveDown(2);

            // Invoice Title and Details
            doc.fontSize(18).font('Helvetica-Bold').text('INVOICE', { align: 'right' });
            doc.fontSize(10).font('Helvetica').text(`Invoice #: ${invoice.id.slice(0, 8).toUpperCase()}`, { align: 'right' });
            doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'right' });
            doc.text(`Status: ${invoice.status.toUpperCase()}`, { align: 'right' });
            doc.moveDown();

            // Doctor and Patient Info Grid
            const startY = doc.y;

            // Patient Info (Left)
            doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', 50, startY);
            doc.fontSize(10).font('Helvetica').text(`${invoice.patient.firstName} ${invoice.patient.lastName}`);
            doc.text(`Phone: ${invoice.patient.phoneNumber}`);
            if (invoice.patient.email) doc.text(`Email: ${invoice.patient.email}`);
            if (invoice.patient.address) doc.text(`Address: ${invoice.patient.address}`);

            // Doctor Info (Right)
            if (invoice.appointment?.doctor) {
                doc.fontSize(12).font('Helvetica-Bold').text('Doctor:', 350, startY);
                doc.fontSize(10).font('Helvetica').text(`Dr. ${invoice.appointment.doctor.name}`);
                doc.text(`Email: ${invoice.appointment.doctor.email}`);
            }

            doc.moveDown(4);

            // Items Table Header
            const tableTop = doc.y + 20;
            doc.font('Helvetica-Bold');
            doc.text('Description', 50, tableTop, { width: 250 });
            doc.text('Qty', 300, tableTop, { width: 50 });
            doc.text('Price', 350, tableTop, { width: 80 });
            doc.text('Amount', 430, tableTop, { width: 100, align: 'right' });

            doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
            doc.font('Helvetica');
            doc.moveDown();

            // Items
            let yPosition = tableTop + 25;
            const items = invoice.items as Array<{ description: string; quantity: number; price: number }>;

            items.forEach((item) => {
                doc.text(item.description, 50, yPosition, { width: 250 });
                doc.text(item.quantity.toString(), 300, yPosition, { width: 50 });
                doc.text(`₹${item.price.toFixed(2)}`, 350, yPosition, { width: 80 });
                doc.text(`₹${(item.quantity * item.price).toFixed(2)}`, 430, yPosition, { width: 100, align: 'right' });
                yPosition += 20;
            });

            // Total
            doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
            yPosition += 10;
            doc.fontSize(12).font('Helvetica-Bold').text('Total:', 350, yPosition);
            doc.text(`₹${invoice.total.toFixed(2)}`, 430, yPosition, { width: 100, align: 'right' });

            // Footer
            doc.fontSize(8).font('Helvetica').text(
                `Thank you for choosing ${process.env.CLINIC_NAME || 'Docita Clinic'}. Get well soon!`,
                50,
                doc.page.height - 50,
                { align: 'center' }
            );

            doc.end();
        });
    }
}
