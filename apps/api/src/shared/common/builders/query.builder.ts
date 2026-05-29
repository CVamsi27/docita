import { Prisma, AppointmentStatus, InvoiceStatus } from '@workspace/db';
import { z } from 'zod';
import { getClinicLocalDayUtcBounds } from '@/shared/common/utils/clinic-calendar-bounds';
import { formatUtcInstantAsClinicPickerIso } from '@workspace/utils';

const appointmentStatusSchema = z.nativeEnum(AppointmentStatus);
const invoiceStatusSchema = z.nativeEnum(InvoiceStatus);

function normalizeEnumStatuses<T extends string>(
  schema: z.ZodType<T>,
  statuses: (string | T)[],
): T[] {
  const normalized: T[] = [];
  for (const status of statuses) {
    if (typeof status !== 'string') {
      normalized.push(status);
      continue;
    }
    const parsed = schema.safeParse(status);
    if (parsed.success) {
      normalized.push(parsed.data);
    }
  }
  return normalized;
}

export class AppointmentQueryBuilder {
  constructor(
    private readonly referenceNow: Date,
    private readonly clinicTimezone: string = 'UTC',
  ) {}

  private where: Prisma.AppointmentWhereInput = {};
  private orderBy: Prisma.AppointmentOrderByWithRelationInput = {
    startTime: 'asc',
  };
  private includeOptions: Prisma.AppointmentInclude = {};
  private selectOptions?: Prisma.AppointmentSelect;
  private takeLimit?: number;
  private skipCount?: number;

  forClinic(clinicId: string): this {
    this.where.clinicId = clinicId;
    return this;
  }

  forPatient(patientId: string): this {
    this.where.patientId = patientId;
    return this;
  }

  forDoctor(doctorId: string): this {
    this.where.doctorId = doctorId;
    return this;
  }

  inDateRange(start: Date, end: Date): this {
    this.where.startTime = {
      gte: start,
      lte: end,
    };
    return this;
  }

  onDate(date: Date): this {
    const pickerDateStr = formatUtcInstantAsClinicPickerIso(
      date,
      this.clinicTimezone,
    );
    const bounds = getClinicLocalDayUtcBounds(
      pickerDateStr,
      this.clinicTimezone,
    );
    if (!bounds) {
      return this;
    }
    return this.inDateRange(bounds.rangeStart, bounds.rangeEndExclusive);
  }

  today(): this {
    return this.onDate(this.referenceNow);
  }

  withStatus(...statuses: (string | AppointmentStatus)[]): this {
    const normalized = normalizeEnumStatuses(appointmentStatusSchema, statuses);
    if (normalized.length === 1) {
      this.where.status = normalized[0];
    } else if (normalized.length > 1) {
      this.where.status = { in: normalized };
    }
    return this;
  }

  excludeCancelled(): this {
    this.where.status = {
      notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
    };
    return this;
  }

  upcoming(): this {
    this.where.startTime = { gte: this.referenceNow };
    this.orderBy = { startTime: 'asc' };
    return this;
  }

  past(): this {
    this.where.startTime = { lt: this.referenceNow };
    this.orderBy = { startTime: 'desc' };
    return this;
  }

  withPatient(select?: Prisma.PatientSelect): this {
    this.includeOptions.patient = select ? { select } : true;
    return this;
  }

  withDoctor(select?: Prisma.UserSelect): this {
    this.includeOptions.doctor = select ? { select } : true;
    return this;
  }

  withPrescription(): this {
    this.includeOptions.prescription = true;
    return this;
  }

  withInvoice(): this {
    this.includeOptions.invoice = true;
    return this;
  }

  withAllRelations(): this {
    return this.withPatient().withDoctor().withPrescription().withInvoice();
  }

  select(fields: Prisma.AppointmentSelect): this {
    this.selectOptions = fields;
    return this;
  }

  orderByField(
    field: keyof Prisma.AppointmentOrderByWithRelationInput,
    direction: 'asc' | 'desc' = 'asc',
  ): this {
    this.orderBy = { [field]: direction };
    return this;
  }

  take(limit: number): this {
    this.takeLimit = limit;
    return this;
  }

  skip(count: number): this {
    this.skipCount = count;
    return this;
  }

  addWhere(conditions: Prisma.AppointmentWhereInput): this {
    this.where = { ...this.where, ...conditions };
    return this;
  }

  build(): Prisma.AppointmentFindManyArgs {
    const result: Prisma.AppointmentFindManyArgs = {
      where: this.where,
      orderBy: this.orderBy,
    };

    if (Object.keys(this.includeOptions).length > 0 && !this.selectOptions) {
      result.include = this.includeOptions;
    }

    if (this.selectOptions) {
      result.select = this.selectOptions;
    }

    if (this.takeLimit) {
      result.take = this.takeLimit;
    }

    if (this.skipCount) {
      result.skip = this.skipCount;
    }

    return result;
  }

  buildForFindMany() {
    return this.build();
  }

  buildForCount(): { where: Prisma.AppointmentWhereInput } {
    return { where: this.where };
  }
}

export class PatientQueryBuilder {
  constructor(private readonly referenceNow: Date) {}

  private where: Prisma.PatientWhereInput = {};
  private orderBy: Prisma.PatientOrderByWithRelationInput = {
    updatedAt: 'desc',
  };
  private includeOptions: Prisma.PatientInclude = {};
  private selectOptions?: Prisma.PatientSelect;
  private takeLimit?: number;
  private skipCount?: number;

  forClinic(clinicId: string): this {
    this.where.clinicId = clinicId;
    return this;
  }

  search(term: string): this {
    this.where.OR = [
      { firstName: { contains: term, mode: 'insensitive' } },
      { lastName: { contains: term, mode: 'insensitive' } },
      { phoneNumber: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
      { mrn: { contains: term, mode: 'insensitive' } },
    ];
    return this;
  }

  withAppointments(options?: { upcoming?: boolean; limit?: number }): this {
    this.includeOptions.appointments = {
      where: options?.upcoming
        ? { startTime: { gte: this.referenceNow } }
        : undefined,
      take: options?.limit,
      orderBy: { startTime: 'desc' },
    };
    return this;
  }

  withTags(): this {
    this.includeOptions.tags = true;
    return this;
  }

  select(fields: Prisma.PatientSelect): this {
    this.selectOptions = fields;
    return this;
  }

  take(limit: number): this {
    this.takeLimit = limit;
    return this;
  }

  skip(count: number): this {
    this.skipCount = count;
    return this;
  }

  build(): Prisma.PatientFindManyArgs {
    const result: Prisma.PatientFindManyArgs = {
      where: this.where,
      orderBy: this.orderBy,
    };

    if (Object.keys(this.includeOptions).length > 0 && !this.selectOptions) {
      result.include = this.includeOptions;
    }

    if (this.selectOptions) {
      result.select = this.selectOptions;
    }

    if (this.takeLimit) result.take = this.takeLimit;
    if (this.skipCount) result.skip = this.skipCount;

    return result;
  }
}

export class InvoiceQueryBuilder {
  private where: Prisma.InvoiceWhereInput = {};
  private orderBy: Prisma.InvoiceOrderByWithRelationInput = {
    createdAt: 'desc',
  };
  private includeOptions: Prisma.InvoiceInclude = {};

  forClinic(clinicId: string): this {
    this.where.patient = { clinicId };
    return this;
  }

  forPatient(patientId: string): this {
    this.where.patientId = patientId;
    return this;
  }

  withStatus(...statuses: (string | InvoiceStatus)[]): this {
    const normalized = normalizeEnumStatuses(invoiceStatusSchema, statuses);
    if (normalized.length === 1) {
      this.where.status = normalized[0];
    } else if (normalized.length > 1) {
      this.where.status = { in: normalized };
    }
    return this;
  }

  unpaid(): this {
    return this.withStatus(InvoiceStatus.PENDING, InvoiceStatus.OVERDUE);
  }

  inDateRange(start: Date, end: Date): this {
    this.where.createdAt = { gte: start, lte: end };
    return this;
  }

  withPatient(): this {
    this.includeOptions.patient = true;
    return this;
  }

  build() {
    return {
      where: this.where,
      orderBy: this.orderBy,
      include:
        Object.keys(this.includeOptions).length > 0
          ? this.includeOptions
          : undefined,
    };
  }
}
