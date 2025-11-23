import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';
import { unlink } from 'fs/promises';
import { Gender } from '@workspace/db';

@Injectable()
export class ImportsService {
    constructor(private prisma: PrismaService) { }

    async processPatientImport(filePath: string) {
        try {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);

            const results = {
                total: data.length,
                success: 0,
                failed: 0,
                errors: [] as string[],
            };

            for (const [index, row] of data.entries()) {
                try {
                    await this.importSinglePatient(row);
                    results.success++;
                } catch (error) {
                    results.failed++;
                    results.errors.push(`Row ${index + 2}: ${(error as Error).message}`);
                }
            }

            return results;
        } finally {
            // Clean up temp file
            try {
                await unlink(filePath);
            } catch (e) {
                console.error('Failed to delete temp import file', e);
            }
        }
    }

    private async importSinglePatient(row: any) {
        // Basic validation and cleaning
        const firstName = row['First Name']?.toString().trim();
        const lastName = row['Last Name']?.toString().trim() || '';
        const phone = this.normalizePhoneNumber(row['Phone Number']);
        const genderStr = row['Gender']?.toString().toUpperCase();

        if (!firstName || !phone) {
            throw new Error('Missing required fields: First Name or Phone Number');
        }

        // Validate Gender
        let gender: Gender = Gender.OTHER;
        if (genderStr === 'MALE' || genderStr === 'M') gender = Gender.MALE;
        else if (genderStr === 'FEMALE' || genderStr === 'F') gender = Gender.FEMALE;

        // Check for duplicates (Phone Number)
        const existingByPhone = await this.prisma.patient.findFirst({
            where: { phoneNumber: phone },
        });

        if (existingByPhone) {
            throw new Error(`Duplicate phone number: ${phone}`);
        }

        // Check for duplicates (Name + DOB) - V2 Feature
        const dob = row['Date of Birth'] ? new Date(row['Date of Birth']) : new Date();
        const existingByNameAndDob = await this.prisma.patient.findFirst({
            where: {
                firstName: { equals: firstName, mode: 'insensitive' },
                lastName: { equals: lastName, mode: 'insensitive' },
                dateOfBirth: dob,
            },
        });

        if (existingByNameAndDob) {
            throw new Error(`Duplicate patient found: ${firstName} ${lastName} (DOB: ${dob.toLocaleDateString()})`);
        }

        // Create patient
        await this.prisma.patient.create({
            data: {
                firstName,
                lastName,
                phoneNumber: phone,
                gender,
                dateOfBirth: dob,
                email: row['Email']?.toString().trim(),
                address: row['Address']?.toString().trim(),
                bloodGroup: row['Blood Group']?.toString().trim(),
                allergies: row['Allergies']?.toString().trim(),
                medicalHistory: row['Medical History'] ? [row['Medical History'].toString()] : [],
                clinicId: 'default-clinic-id', // Use default clinic for imports
            },
        });
    }

    private normalizePhoneNumber(phone: any): string {
        return phone.toString().replace(/\D/g, '');
    }
}
