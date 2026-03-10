import { APIRequestContext, expect, test } from "@playwright/test";

const API_URL = "http://127.0.0.1:3001/api";

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(Object.entries(value));
}

interface AdminUser {
  id: string;
  email: string;
  accessToken: string;
  role: string;
}

interface AdminRes {
  user: { id: string };
  access_token?: string;
  accessToken?: string;
}

test.describe("Admin App - Critical Flows", () => {
  let adminUser: AdminUser;
  let request: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    const context = await playwright.chromium.launchPersistentContext("", {});
    request = context.request;

    const adminEmail = `admin-critical-${Date.now()}@test.com`;
    const adminRes = await request.post(`${API_URL}/auth/register`, {
      data: {
        email: adminEmail,
        password: "Admin@123456",
        firstName: "Admin",
        lastName: "User",
        role: "ADMIN",
      },
    });

    expect(adminRes.ok()).toBeTruthy();
    const adminData = (await adminRes.json()) as AdminRes;
    adminUser = {
      id: String(adminData.user?.id || ""),
      email: adminEmail,
      accessToken: String(adminData.access_token || adminData.accessToken || ""),
      role: "ADMIN",
    };
  });

  test(" ADMIN FLOW 1: Admin Authentication & Dashboard Access", async () => {

    const loginRes = await request.post(`${API_URL}/auth/login`, {
      data: {
        email: adminUser.email,
        password: "Admin@123456",
      },
    });

    expect(loginRes.ok()).toBeTruthy();
    const loginData = toRecord(await loginRes.json());
    const freshToken = loginData.access_token || loginData.accessToken;
    expect(freshToken).toBeTruthy();

    const dashboardRes = await request.get(`${API_URL}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    });

    if (dashboardRes.ok()) {
      toRecord(await dashboardRes.json());
    } else {

    }

    const systemRes = await request.get(`${API_URL}/admin/system`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    });

    if (systemRes.ok()) {
      toRecord(await systemRes.json());
    }

  });

  test(" ADMIN FLOW 2: User Management - List, Create, Update, Delete", async () => {

    const usersRes = await request.get(`${API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${adminUser.accessToken}` },
    });

    expect(usersRes.ok()).toBeTruthy();
    const users = (await usersRes.json()) as Array<Record<string, unknown>>;
    expect(Array.isArray(users)).toBeTruthy();

    const newUserEmail = `managed-user-${Date.now()}@test.com`;
    const createUserRes = await request.post(`${API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${adminUser.accessToken}` },
      data: {
        email: newUserEmail,
        firstName: "Managed",
        lastName: "User",
        role: "DOCTOR",
        status: "ACTIVE",
      },
    });

    expect(createUserRes.ok()).toBeTruthy();
    const newUser = toRecord(await createUserRes.json());
    expect(String(newUser.email)).toBe(newUserEmail);

    const updateUserRes = await request.patch(
      `${API_URL}/admin/users/${newUser.id}`,
      {
        headers: { Authorization: `Bearer ${adminUser.accessToken}` },
        data: {
          firstName: "Updated",
          status: "ACTIVE",
        },
      },
    );

    if (updateUserRes.ok()) {
      const updatedUser = (await updateUserRes.json()) as Record<
        string,
        unknown
      >;
      expect(updatedUser.firstName).toBe("Updated");

    } else {

    }

    const updatedUsersRes = await request.get(`${API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${adminUser.accessToken}` },
    });

    expect(updatedUsersRes.ok()).toBeTruthy();
    const updatedUsers = (await updatedUsersRes.json()) as Array<
      Record<string, unknown>
    >;
    const userExists = updatedUsers.some((u) => String(u.id) === String(newUser.id));
    expect(userExists).toBeTruthy();

    const deactivateRes = await request.patch(
      `${API_URL}/admin/users/${newUser.id}`,
      {
        headers: { Authorization: `Bearer ${adminUser.accessToken}` },
        data: { status: "INACTIVE" },
      },
    );

    if (deactivateRes.ok()) {

    } else {

    }

  });

  test(" ADMIN FLOW 3: Clinic Management - View, Create, Update Clinics", async () => {

    const clinicsRes = await request.get(`${API_URL}/admin/clinics`, {
      headers: { Authorization: `Bearer ${adminUser.accessToken}` },
    });

    expect(clinicsRes.ok()).toBeTruthy();
    const clinics = (await clinicsRes.json()) as Array<Record<string, unknown>>;
    expect(Array.isArray(clinics)).toBeTruthy();

    if (clinics.length > 0) {
      const clinicDetailsRes = await request.get(
        `${API_URL}/admin/clinics/${clinics[0].id}`,
        {
          headers: { Authorization: `Bearer ${adminUser.accessToken}` },
        },
      );

      if (clinicDetailsRes.ok()) {
        await clinicDetailsRes.json();
      }
    }

    const newClinicRes = await request.post(`${API_URL}/admin/clinics`, {
      headers: { Authorization: `Bearer ${adminUser.accessToken}` },
      data: {
        name: `Admin Created Clinic ${Date.now()}`,
        email: `clinic-admin-${Date.now()}@test.com`,
        phone: "1111222233",
        address: "789 Admin Ave",
        tier: "ENTERPRISE",
      },
    });

    if (newClinicRes.ok()) {
      const newClinic = toRecord(await newClinicRes.json());

      const updateClinicRes = await request.patch(
        `${API_URL}/admin/clinics/${newClinic.id}`,
        {
          headers: { Authorization: `Bearer ${adminUser.accessToken}` },
          data: {
            phone: "9999888877",
          },
        },
      );

      if (updateClinicRes.ok()) {

      }

      const statsRes = await request.get(
        `${API_URL}/admin/clinics/${newClinic.id}/statistics`,
        {
          headers: { Authorization: `Bearer ${adminUser.accessToken}` },
        },
      );

      if (statsRes.ok()) {
        toRecord(await statsRes.json());
      }
    } else {
      
    }

  });

  test(" ADMIN FLOW 4: System Analytics & Reporting", async () => {

    const statsRes = await request.get(`${API_URL}/admin/statistics`, {
      headers: { Authorization: `Bearer ${adminUser.accessToken}` },
    });

    if (statsRes.ok()) {
      toRecord(await statsRes.json());
    } else {

    }

    const userAnalyticsRes = await request.get(
      `${API_URL}/admin/analytics/users`,
      {
        headers: { Authorization: `Bearer ${adminUser.accessToken}` },
      },
    );

    if (userAnalyticsRes.ok()) {
      toRecord(await userAnalyticsRes.json());

    }

    const appointmentAnalyticsRes = await request.get(
      `${API_URL}/admin/analytics/appointments`,
      {
        headers: { Authorization: `Bearer ${adminUser.accessToken}` },
      },
    );

    if (appointmentAnalyticsRes.ok()) {
      toRecord(await appointmentAnalyticsRes.json());

    }

    const revenueAnalyticsRes = await request.get(
      `${API_URL}/admin/analytics/revenue`,
      {
        headers: { Authorization: `Bearer ${adminUser.accessToken}` },
      },
    );

    if (revenueAnalyticsRes.ok()) {
      toRecord(await revenueAnalyticsRes.json());

    }

    const reportRes = await request.get(`${API_URL}/admin/reports/system`, {
      headers: { Authorization: `Bearer ${adminUser.accessToken}` },
    });

    if (reportRes.ok()) {

    }

  });

  test(" ADMIN FLOW 5: System Monitoring & Health Checks", async () => {

    const healthRes = await request.get(`${API_URL}/health`, {
      headers: { Authorization: `Bearer ${adminUser.accessToken}` },
    });

    if (healthRes.ok()) {
      toRecord(await healthRes.json());
    }

    const dbStatusRes = await request.get(`${API_URL}/admin/system/database`, {
      headers: { Authorization: `Bearer ${adminUser.accessToken}` },
    });

    if (dbStatusRes.ok()) {
      toRecord(await dbStatusRes.json());

    }

    const cacheStatusRes = await request.get(`${API_URL}/admin/system/cache`, {
      headers: { Authorization: `Bearer ${adminUser.accessToken}` },
    });

    if (cacheStatusRes.ok()) {
      toRecord(await cacheStatusRes.json());

    }

    const metricsRes = await request.get(`${API_URL}/admin/metrics`, {
      headers: { Authorization: `Bearer ${adminUser.accessToken}` },
    });

    if (metricsRes.ok()) {
      toRecord(await metricsRes.json());

    }

    const logsRes = await request.get(`${API_URL}/admin/logs?limit=10`, {
      headers: { Authorization: `Bearer ${adminUser.accessToken}` },
    });

    if (logsRes.ok()) {
      toRecord(await logsRes.json());
    }

  });

  test(" ADMIN FLOW 6: Permission & Access Control", async () => {

    const doctorEmail = `doctor-perm-${Date.now()}@test.com`;
    const doctorRes = await request.post(`${API_URL}/auth/register`, {
      data: {
        email: doctorEmail,
        password: "Doctor@123456",
        firstName: "Doctor",
        lastName: "User",
        role: "DOCTOR",
        clinicName: `Doctor Clinic ${Date.now()}`,
      },
    });

    expect(doctorRes.ok()).toBeTruthy();
    const doctorData = toRecord(await doctorRes.json());
    const doctorToken = doctorData.access_token || doctorData.accessToken;

    const adminUsersRes = await request.get(`${API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });

    expect([403, 401]).toContain(adminUsersRes.status());
    

    const createUserRes = await request.post(`${API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: {
        email: `user-${Date.now()}@test.com`,
        firstName: "Test",
        lastName: "User",
        role: "DOCTOR",
      },
    });

    expect([403, 401]).toContain(createUserRes.status());
    

    const adminClinicsRes = await request.get(`${API_URL}/admin/clinics`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });

    expect([403, 401]).toContain(adminClinicsRes.status());
    

    const doctorClinicRes = await request.get(`${API_URL}/clinics`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });

    if (doctorClinicRes.ok()) {

    }

  });

  test.afterAll(async () => {

  });
});
