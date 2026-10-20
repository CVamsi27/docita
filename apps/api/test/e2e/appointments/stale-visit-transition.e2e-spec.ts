import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import {
  setupTestDatabase,
  resetDatabase,
  getPrismaInstance,
  closeDatabase,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';
import {
  APPOINTMENT_WRITE_REPOSITORY_TOKEN,
  type IAppointmentWriteRepository,
} from '@/domains/appointments/core/repositories/appointment.repository.interface';
import { UpdateAppointmentDetailsUseCase } from '@/domains/appointments/application/use-cases/update-appointment-details.use-case';
import { AppointmentStatusEnum } from '@/domains/appointments/core/value-objects/appointment-status.value-object';

/**
 * W01 acceptance: "stale actions cannot reopen completed visits."
 *
 * The terminal transitions read the row, decide, then write. Historically the
 * writes carried no precondition, so an action decided against an older state
 * still landed: a start-consultation decided while the visit was CONFIRMED
 * flipped a COMPLETED appointment (and its COMPLETED queue token) back to
 * IN_PROGRESS, and a queue "call" did the same to a finished token. The stale
 * interleaving is injected directly at the write boundary — the observed state
 * is passed in by the caller exactly as a losing race would supply it.
 */
describe('Stale visit transitions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let writeRepository: IAppointmentWriteRepository;
  let updateDetailsUseCase: UpdateAppointmentDetailsUseCase;
  let clinicId: string;
  let doctorId: string;
  let patientId: string;
  let token: string;

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    writeRepository = moduleFixture.get<IAppointmentWriteRepository>(
      APPOINTMENT_WRITE_REPOSITORY_TOKEN,
    );
    updateDetailsUseCase = moduleFixture.get<UpdateAppointmentDetailsUseCase>(
      UpdateAppointmentDetailsUseCase,
    );
    setPrismaInstance(prisma);
  });

  beforeEach(async () => {
    await resetDatabase();

    // ESSENTIAL keeps the queue endpoints (QUEUE_MANAGEMENT) reachable for a
    // doctor and is not Front Desk, so start-consultation is not gated.
    const clinic = await factories.clinic({
      timezone: 'Asia/Kolkata',
      tier: 'ESSENTIAL',
    });
    clinicId = clinic.id;
    const { user, plainPassword } = await factories.user({
      clinicId,
      role: 'DOCTOR',
    });
    doctorId = user.id;
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: plainPassword })
      .expect(201);
    token = loginRes.body.access_token as string;
    const patient = await factories.patient(clinicId);
    patientId = patient.id;
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  function makeAppointment(overrides = {}) {
    return factories.appointment(patientId, doctorId, clinicId, overrides);
  }

  async function makeToken(
    appointmentId: string,
    status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' = 'WAITING',
  ) {
    return prisma.queueToken.create({
      data: {
        clinicId,
        appointmentId,
        patientId,
        doctorId,
        tokenNumber: 1,
        tokenType: 'scheduled',
        status,
      },
    });
  }

  async function appointmentStatus(id: string): Promise<string | undefined> {
    const row = await prisma.appointment.findUnique({
      where: { id },
      select: { status: true },
    });
    return row?.status;
  }

  async function tokenStatus(id: string): Promise<string | undefined> {
    const row = await prisma.queueToken.findUnique({
      where: { id },
      select: { status: true },
    });
    return row?.status;
  }

  describe('start-consultation decided against a stale status', () => {
    it('does not reopen a completed appointment', async () => {
      const appointment = await makeAppointment({ status: 'COMPLETED' });

      // The decision was taken while the visit was still CONFIRMED.
      await expect(
        writeRepository.startConsultationTx(
          appointment.id,
          clinicId,
          null,
          AppointmentStatusEnum.CONFIRMED,
        ),
      ).rejects.toThrow(ConflictException);

      expect(await appointmentStatus(appointment.id)).toBe('COMPLETED');
    });

    it('does not reopen a completed queue token', async () => {
      const appointment = await makeAppointment({ status: 'IN_PROGRESS' });
      const queueToken = await makeToken(appointment.id, 'COMPLETED');

      await expect(
        writeRepository.startConsultationTx(
          appointment.id,
          clinicId,
          {
            id: queueToken.id,
            calledAt: new Date(),
            consultationStart: new Date(),
          },
          AppointmentStatusEnum.IN_PROGRESS,
        ),
      ).rejects.toThrow(ConflictException);

      expect(await appointmentStatus(appointment.id)).toBe('IN_PROGRESS');
      expect(await tokenStatus(queueToken.id)).toBe('COMPLETED');
    });

    it('reports a missing appointment as not found rather than a conflict', async () => {
      await expect(
        writeRepository.startConsultationTx(
          'clinic-scoped-missing-id',
          clinicId,
          null,
          AppointmentStatusEnum.CONFIRMED,
        ),
      ).rejects.toThrow(/not found/);
    });
  });

  describe('queue actions against a finished token', () => {
    it('refuses to call a patient whose token is already completed', async () => {
      const appointment = await makeAppointment({ status: 'COMPLETED' });
      const queueToken = await makeToken(appointment.id, 'COMPLETED');

      await request(app.getHttpServer())
        .post(`/queue/call/${queueToken.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(await tokenStatus(queueToken.id)).toBe('COMPLETED');
    });

    it('treats completing an already completed token as a no-op', async () => {
      const appointment = await makeAppointment({ status: 'COMPLETED' });
      const queueToken = await makeToken(appointment.id, 'COMPLETED');

      await request(app.getHttpServer())
        .post(`/queue/complete/${queueToken.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(await tokenStatus(queueToken.id)).toBe('COMPLETED');
    });

    it('still walks a live token through call and complete', async () => {
      const appointment = await makeAppointment();
      const queueToken = await makeToken(appointment.id, 'WAITING');

      await request(app.getHttpServer())
        .post(`/queue/call/${queueToken.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);
      expect(await tokenStatus(queueToken.id)).toBe('IN_PROGRESS');

      await request(app.getHttpServer())
        .post(`/queue/complete/${queueToken.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);
      expect(await tokenStatus(queueToken.id)).toBe('COMPLETED');
    });
  });

  describe('detail patches decided against a stale status', () => {
    it('does not reopen a completed appointment through a status patch', async () => {
      const appointment = await makeAppointment({ status: 'COMPLETED' });

      await expect(
        updateDetailsUseCase.execute({
          appointmentId: appointment.id,
          clinicId,
          // What an in-flight consultation autosave carries.
          data: { status: 'in-progress' },
          appointment: {
            id: appointment.id,
            clinicId,
            patientId,
            doctorId,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            // The patch was built from a read taken while the visit was live.
            status: AppointmentStatusEnum.IN_PROGRESS,
          },
        }),
      ).rejects.toThrow(ConflictException);

      expect(await appointmentStatus(appointment.id)).toBe('COMPLETED');
    });

    it('saves clinical fields on a completed appointment', async () => {
      const appointment = await makeAppointment({ status: 'COMPLETED' });

      await request(app.getHttpServer())
        .patch(`/appointments/${appointment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ chiefComplaint: 'post-completion edit still allowed today' })
        .expect(200);

      expect(await appointmentStatus(appointment.id)).toBe('COMPLETED');
    });
  });

  describe('ordinary workflow', () => {
    it('starts and completes a consultation', async () => {
      const appointment = await makeAppointment();
      const queueToken = await makeToken(appointment.id, 'WAITING');

      await request(app.getHttpServer())
        .post(`/appointments/${appointment.id}/start-consultation`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);
      expect(await appointmentStatus(appointment.id)).toBe('IN_PROGRESS');
      expect(await tokenStatus(queueToken.id)).toBe('IN_PROGRESS');

      await request(app.getHttpServer())
        .patch(`/appointments/${appointment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'completed' })
        .expect(200);
      expect(await appointmentStatus(appointment.id)).toBe('COMPLETED');

      // Re-opening the consultation is not needed to finish it again.
      await request(app.getHttpServer())
        .post(`/appointments/${appointment.id}/start-consultation`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('accepts a repeated completion patch', async () => {
      const appointment = await makeAppointment({ status: 'IN_PROGRESS' });

      await request(app.getHttpServer())
        .patch(`/appointments/${appointment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'completed' })
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/appointments/${appointment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(await appointmentStatus(appointment.id)).toBe('COMPLETED');
    });
  });
});
