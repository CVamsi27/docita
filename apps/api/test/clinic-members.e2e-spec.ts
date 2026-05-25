import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  setupTestDatabase,
  resetDatabase,
  closeDatabase,
  getPrismaInstance,
} from './setup';
import { setPrismaInstance } from './factories';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import { mockWhatsappService } from './whatsapp.provider';

describe('Clinic Members Lifecycle (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .overrideProvider(WhatsappService)
      .useValue(mockWhatsappService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    setPrismaInstance(moduleFixture.get<PrismaService>(PrismaService));
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await closeDatabase();
  });

  it('onboards clinic admin and performs member create/list/update/delete', async () => {
    const now = Date.now();
    const adminEmail = `e2e.admin.${now}@docita.work`;
    const adminPassword = 'E2E!Admin!12345';
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        firstName: 'E2E',
        lastName: 'Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'ADMIN',
      })
      .expect(201);

    const bootstrapToken =
      registerResponse.body?.access_token || registerResponse.body?.accessToken;
    expect(bootstrapToken).toBeDefined();

    const initResponse = await request(app.getHttpServer())
      .post('/onboarding/initialize')
      .set('Authorization', `Bearer ${bootstrapToken}`)
      .expect(201);

    const onboardingId = initResponse.body?.onboardingId;
    expect(onboardingId).toBeDefined();

    const signatureSession = await getPrismaInstance().uploadSession.create({
      data: {
        status: 'uploaded',
        fileUrl: `https://storage.example.com/signatures/sla-${now}.png`,
        purpose: 'GENERAL',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    const completeResponse = await request(app.getHttpServer())
      .post(`/onboarding/${onboardingId}/complete`)
      .set('Authorization', `Bearer ${bootstrapToken}`)
      .send({
        clinicDetails: {
          name: `E2E Clinic ${now}`,
          email: `e2e.clinic.${now}@docita.work`,
          phone: '+911234567890',
          address: '123456, E2E Street, Hyderabad, Telangana',
          city: 'Hyderabad',
          state: 'TS',
          pincode: '500001',
          gstin: '22AAAAA0000A1Z5',
        },
        adminAccount: {
          name: 'E2E Admin',
          email: adminEmail,
          password: adminPassword,
          phoneNumber: '+919111111111',
        },
        planSelection: {
          tier: 'ESSENTIAL',
          billingCycle: 'MONTHLY',
          whatsappAddon: false,
          intelligenceAddon: false,
        },
        paymentDetails: {
          skipPayment: true,
          razorpayPaymentId: `pay_e2e_${now}`,
          autoPay: false,
          addons: {
            whatsapp: false,
            intelligence: false,
          },
        },
        slaAgreement: {
          acceptedSLA: true,
          slaVersion: '1.0',
          acceptedBy: 'E2E Admin',
          signatureSessionId: signatureSession.id,
          acceptedDataProcessingTerms: true,
          acceptedPrivacyPolicy: true,
        },
        consentManagement: {
          enableWhatsAppCommunication: false,
          enableMarketingCommunications: false,
          dataProcessingPurposes: ['TREATMENT'],
          patientConsentRequiredBeforeWhatsApp: true,
          logAllConsentChanges: true,
        },
        staffSetup: {
          staffMembers: [],
        },
      })
      .expect(201);

    expect(completeResponse.body).toBeDefined();

    const completion = completeResponse.body;
    const token =
      completion?.accessToken ||
      completion?.access_token ||
      completion?.data?.accessToken ||
      completion?.data?.access_token;
    const clinicId =
      completion?.clinicId ||
      completion?.data?.clinicId ||
      completion?.user?.clinicId;

    if (!token || !clinicId) {
      throw new Error(
        `Onboarding complete did not return auth context: ${JSON.stringify(completion)}`,
      );
    }

    expect(token).toBeDefined();
    expect(clinicId).toBeDefined();

    const createReceptionistResponse = await request(app.getHttpServer())
      .post(`/clinics/${clinicId}/receptionists`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'E2E Receptionist',
        email: `e2e.receptionist.${now}@docita.work`,
        password: 'E2E!Rec!12345',
        phoneNumber: '+919999999999',
      })
      .expect(201);

    const memberId = createReceptionistResponse.body?.id;
    expect(memberId).toBeDefined();

    const listMembersResponse = await request(app.getHttpServer())
      .get('/clinic/members')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(listMembersResponse.body)).toBe(true);
    const createdMember = listMembersResponse.body.find(
      (member: { id: string }) => member.id === memberId,
    );
    expect(createdMember).toBeDefined();

    const updateMemberResponse = await request(app.getHttpServer())
      .put(`/clinic/members/${memberId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'E2E Receptionist Updated',
        phoneNumber: '+918888888888',
      })
      .expect(200);

    expect(updateMemberResponse.body?.name).toBe('E2E Receptionist Updated');
    expect(updateMemberResponse.body?.phoneNumber).toBe('+918888888888');

    const deleteMemberResponse = await request(app.getHttpServer())
      .delete(`/clinic/members/${memberId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(deleteMemberResponse.body?.success).toBe(true);

    const deletedMember = await getPrismaInstance().user.findUnique({
      where: { id: memberId },
      select: { id: true },
    });
    expect(deletedMember).toBeNull();
  });
});
