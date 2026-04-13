import { expect, test } from "@playwright/test";
import { appointmentResponseSchema, type DentalChartData } from "@workspace/types";
import { z } from "zod";
import {
  API_URL,
  loginUser,
  setupTestUser,
} from "./utils/patient-helpers";

const patientResponseSchema = z.object({
  id: z.string(),
});

const dentalChartFixture: DentalChartData = {
  "11": {
    condition: "CARIES",
    notes: "Sample cavity",
  },
};

test.describe("Dental Charts", () => {
  let testUser: Awaited<ReturnType<typeof setupTestUser>> | undefined;

  test.beforeAll(async ({ request }) => {
    testUser = await setupTestUser(request, {}, { clinicType: "DENTAL" });

    const patientRes = await request.post(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${testUser.accessToken}` },
      data: {
        firstName: "Dental",
        lastName: "Patient",
        phoneNumber: `97${Math.floor(Math.random() * 100000000)
          .toString()
          .padStart(8, "0")}`,
        gender: "FEMALE",
        dateOfBirth: "1990-01-01",
        clinicId: testUser.clinicId,
      },
    });

    expect(patientRes.ok()).toBeTruthy();
    const patient = patientResponseSchema.parse(await patientRes.json());

    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 1);
    startTime.setHours(startTime.getHours() + 1);

    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + 30);

    const appointmentRes = await request.post(`${API_URL}/appointments`, {
      headers: { Authorization: `Bearer ${testUser.accessToken}` },
      data: {
        patientId: patient.id,
        doctorId: testUser.id,
        clinicId: testUser.clinicId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        type: "consultation",
        status: "scheduled",
      },
    });

    expect(appointmentRes.ok()).toBeTruthy();
    const appointment = appointmentResponseSchema.parse(
      await appointmentRes.json(),
    );

    const chartRes = await request.patch(
      `${API_URL}/appointments/${appointment.id}`,
      {
        headers: { Authorization: `Bearer ${testUser.accessToken}` },
        data: {
          dentalChart: dentalChartFixture,
        },
      },
    );

    expect(chartRes.ok()).toBeTruthy();
    const updatedAppointment = appointmentResponseSchema.parse(
      await chartRes.json(),
    );
    expect(updatedAppointment.dentalChart).toEqual(dentalChartFixture);

    const fetchedAppointmentRes = await request.get(
      `${API_URL}/appointments/${appointment.id}`,
      {
        headers: { Authorization: `Bearer ${testUser.accessToken}` },
      },
    );

    expect(fetchedAppointmentRes.ok()).toBeTruthy();
    const fetchedAppointment = appointmentResponseSchema.parse(
      await fetchedAppointmentRes.json(),
    );
    expect(fetchedAppointment.dentalChart).toEqual(dentalChartFixture);
  });

  test("renders the dental charts route", async ({ page }) => {
    if (!testUser) {
      throw new Error("Test user was not initialized");
    }

    await loginUser(page, testUser);
    const response = await page.goto("/specialty/dental-charts");

    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/specialty\/dental-charts/);
  });
});
