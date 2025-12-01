import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import {
  formatDate,
  calculateAge,
  DATE_FORMATS,
  DEFAULT_TIMEZONE,
  DEFAULT_LOCALE,
} from '@workspace/types';

@Injectable()
export class PrescriptionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(clinicId: string) {
    if (!clinicId) {
      return [];
    }
    return this.prisma.prescription.findMany({
      where: { patient: { clinicId } },
      include: {
        medications: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            gender: true,
            dateOfBirth: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        medications: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
            gender: true,
            dateOfBirth: true,
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
    });

    if (!prescription) {
      throw new NotFoundException(`Prescription with ID ${id} not found`);
    }

    return prescription;
  }

  async create(data: {
    appointmentId: string;
    patientId: string;
    doctorId: string;
    instructions?: string;
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      route?: string;
    }>;
  }) {
    const prescription = await this.prisma.prescription.create({
      data: {
        appointmentId: data.appointmentId,
        patientId: data.patientId,
        doctorId: data.doctorId,
        instructions: data.instructions,
        medications: {
          create: data.medications.map((med) => ({
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration,
            route: med.route || 'PO',
          })),
        },
      },
      include: {
        medications: true,
      },
    });

    return prescription;
  }
  async generatePDF(
    id: string,
    timezone: string = DEFAULT_TIMEZONE,
    locale: string = DEFAULT_LOCALE,
  ): Promise<Buffer> {
    const prescription = await this.findOne(id);

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
        .text('PRESCRIPTION', { align: 'center' });
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(
          `Date: ${formatDate(prescription.createdAt, DATE_FORMATS.DATE_LONG, { timezone })}`,
          { align: 'right' },
        );
      doc.moveDown();

      const startY = doc.y;

      doc.fontSize(12).font('Helvetica-Bold').text('Doctor:', 50, startY);
      doc.fontSize(10).font('Helvetica').text(prescription.doctor.name);
      doc.text(`Email: ${prescription.doctor.email}`);

      doc.fontSize(12).font('Helvetica-Bold').text('Patient:', 350, startY);
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(
          `${prescription.patient.firstName} ${prescription.patient.lastName}`,
        );

      // Use timezone-aware age calculation
      const patientAge = calculateAge(prescription.patient.dateOfBirth);
      doc.text(`Age: ${patientAge ?? 'N/A'} Years`);
      doc.text(`Gender: ${prescription.patient.gender}`);

      doc.moveDown(4);

      const tableTop = doc.y + 20;
      doc.font('Helvetica-Bold');
      doc.text('Medication', 50, tableTop, { width: 150 });
      doc.text('Route', 200, tableTop, { width: 50 });
      doc.text('Dosage', 250, tableTop, { width: 80 });
      doc.text('Frequency', 330, tableTop, { width: 100 });
      doc.text('Duration', 430, tableTop, { width: 100 });

      doc
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();
      doc.font('Helvetica');
      doc.moveDown();

      let yPosition = tableTop + 25;
      prescription.medications.forEach((med) => {
        doc.text(med.name, 50, yPosition, { width: 150 });
        doc.text(med.route || 'PO', 200, yPosition, { width: 50 });
        doc.text(med.dosage, 250, yPosition, { width: 80 });
        doc.text(med.frequency, 330, yPosition, { width: 100 });
        doc.text(med.duration, 430, yPosition, { width: 100 });
        yPosition += 20;
      });

      doc.moveDown(2);

      if (prescription.instructions) {
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Instructions:', 50, doc.y);
        doc.fontSize(10).font('Helvetica').text(prescription.instructions);
      }

      doc
        .fontSize(8)
        .font('Helvetica')
        .text(
          'This is a computer generated prescription.',
          50,
          doc.page.height - 50,
          { align: 'center' },
        );

      doc.end();
    });
  }
}
