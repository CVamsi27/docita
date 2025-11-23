"use server"

import prisma from "@workspace/db"
import { revalidatePath } from 'next/cache'
import type { Patient } from '@workspace/db'

export async function getPatients(): Promise<Patient[]> {
    try {
        const patients = await prisma.patient.findMany({
            orderBy: {
                updatedAt: 'desc'
            }
        })
        // Transform dates to strings for serialization if needed, or ensure types match
        // Prisma dates are Date objects, Zod schema expects Date or String.
        // We might need to map if we want strictly one or the other on the client.
        return patients as unknown as Patient[]
    } catch (error) {
        console.error("Failed to fetch patients:", error)
        return []
    }
}

export async function createPatient(data: any) {
    try {
        const { tags, ...rest } = data;
        const patient = await prisma.patient.create({
            data: {
                ...rest,
                dateOfBirth: new Date(rest.dateOfBirth), // Ensure date is Date object
                clinicId: rest.clinicId || 'default-clinic-id', // Use provided clinicId or default
                tags: tags ? {
                    create: tags.map((t: any) => ({
                        tag: t.tag,
                        color: t.color || 'blue'
                    }))
                } : undefined
            },
        });
        revalidatePath('/patients');
        return { success: true, patient };
    } catch (error) {
        console.error("Failed to create patient:", error)
        return { success: false, error: "Failed to create patient" }
    }
}
