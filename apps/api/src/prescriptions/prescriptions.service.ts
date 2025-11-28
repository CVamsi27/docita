/* eslint-disable */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';

@Injectable()
export class PrescriptionsService {
  constructor(private prisma: PrismaService) { }

  async findAll() {
    return this.prisma.prescription.findMany({
      include: {
        medications: true,
        patient: true,
        doctor: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        medications: true,
        patient: true,
        doctor: true,
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
    }>;
  }) {
    const prescription = await this.prisma.prescription.create({
      data: {
        appointmentId: data.appointmentId,
        patientId: data.patientId,
        doctorId: data.doctorId,
        instructions: data.instructions,
        medications: {
          create: data.medications,
        },
      },
      include: {
        medications: true,
      },
    });

    return prescription;
  }
  async generatePDF(id: string): Promise<Buffer> {
    const prescription = await this.findOne(id);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Hospital Header
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

      // Prescription Title and Date
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('PRESCRIPTION', { align: 'center' });
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(
          `Date: ${new Date(prescription.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`,
          { align: 'right' },
        );
      doc.moveDown();

      // Doctor and Patient Info Grid
      const startY = doc.y;

      // Doctor Info (Left)
      doc.fontSize(12).font('Helvetica-Bold').text('Doctor:', 50, startY);
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Dr. ${prescription.doctor.name}`);
      doc.text(`Email: ${prescription.doctor.email}`);

      // Patient Info (Right)
      doc.fontSize(12).font('Helvetica-Bold').text('Patient:', 350, startY);
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(
          `${prescription.patient.firstName} ${prescription.patient.lastName}`,
        );
      doc.text(
        `Age: ${prescription.patient.dateOfBirth ? new Date().getFullYear() - new Date(prescription.patient.dateOfBirth).getFullYear() : 'N/A'} Years`,
      );
      doc.text(`Gender: ${prescription.patient.gender}`);

      doc.moveDown(4);

      // Medications Table Header
      const tableTop = doc.y + 20;
      doc.font('Helvetica-Bold');
      doc.text('Medication', 50, tableTop, { width: 200 });
      doc.text('Dosage', 250, tableTop, { width: 100 });
      doc.text('Frequency', 350, tableTop, { width: 100 });
      doc.text('Duration', 450, tableTop, { width: 100 });

      doc
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();
      doc.font('Helvetica');
      doc.moveDown();

      // Medications
      let yPosition = tableTop + 25;
      prescription.medications.forEach((med) => {
        doc.text(med.name, 50, yPosition, { width: 200 });
        doc.text(med.dosage, 250, yPosition, { width: 100 });
        doc.text(med.frequency, 350, yPosition, { width: 100 });
        doc.text(med.duration, 450, yPosition, { width: 100 });
        yPosition += 20;
      });

      doc.moveDown(2);

      // Instructions
      if (prescription.instructions) {
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Instructions:', 50, doc.y);
        doc.fontSize(10).font('Helvetica').text(prescription.instructions);
      }

      // Footer
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
