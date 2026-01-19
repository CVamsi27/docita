import { Prisma } from '@workspace/db';

/**
 * Query Builder for Appointments.
 *
 * Provides a fluent interface for building complex appointment queries.
 * This replaces scattered query building logic across services.
 *
 * @example
 * ```typescript
 * const query = new AppointmentQueryBuilder()
 *   .forClinic(clinicId)
 *   .forDoctor(doctorId)
 *   .inDateRange(startDate, endDate)
 *   .excludeCancelled()
 *   .withPatient()
 *   .build();
 *
 * const appointments = await prisma.appointment.findMany(query);
 * ```
 */
export class AppointmentQueryBuilder {
  private where: Prisma.AppointmentWhereInput = {};
  private orderBy: Prisma.AppointmentOrderByWithRelationInput = {
    startTime: 'asc',
  };
  private includeOptions: Prisma.AppointmentInclude = {};
  private selectOptions?: Prisma.AppointmentSelect;
  private takeLimit?: number;
  private skipCount?: number;

  /**
   * Filter by clinic ID
   */
  forClinic(clinicId: string): this {
    this.where.clinicId = clinicId;
    return this;
  }

  /**
   * Filter by patient ID
   */
  forPatient(patientId: string): this {
    this.where.patientId = patientId;
    return this;
  }

  /**
   * Filter by doctor ID
   */
  forDoctor(doctorId: string): this {
    this.where.doctorId = doctorId;
    return this;
  }

  /**
   * Filter by date range (inclusive)
   */
  inDateRange(start: Date, end: Date): this {
    this.where.startTime = {
      gte: start,
      lte: end,
    };
    return this;
  }

  /**
   * Filter for appointments on a specific date
   */
  onDate(date: Date): this {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return this.inDateRange(startOfDay, endOfDay);
  }

  /**
   * Filter for today's appointments
   */
  today(): this {
    return this.onDate(new Date());
  }

  /**
   * Filter by specific status(es)
   */
  withStatus(...statuses: string[]): this {
    if (statuses.length === 1) {
      this.where.status = statuses[0];
    } else {
      this.where.status = { in: statuses };
    }
    return this;
  }

  /**
   * Exclude cancelled and no-show appointments
   */
  excludeCancelled(): this {
    this.where.status = { notIn: ['cancelled', 'no-show'] };
    return this;
  }

  /**
   * Filter for upcoming appointments only
   */
  upcoming(): this {
    this.where.startTime = { gte: new Date() };
    this.orderBy = { startTime: 'asc' };
    return this;
  }

  /**
   * Filter for past appointments only
   */
  past(): this {
    this.where.startTime = { lt: new Date() };
    this.orderBy = { startTime: 'desc' };
    return this;
  }

  /**
   * Include patient relation
   */
  withPatient(select?: Prisma.PatientSelect): this {
    this.includeOptions.patient = select ? { select } : true;
    return this;
  }

  /**
   * Include doctor relation
   */
  withDoctor(select?: Prisma.UserSelect): this {
    this.includeOptions.doctor = select ? { select } : true;
    return this;
  }

  /**
   * Include prescription relation
   */
  withPrescription(): this {
    this.includeOptions.prescription = true;
    return this;
  }

  /**
   * Include invoice relation
   */
  withInvoice(): this {
    this.includeOptions.invoice = true;
    return this;
  }

  /**
   * Include all common relations
   */
  withAllRelations(): this {
    return this.withPatient().withDoctor().withPrescription().withInvoice();
  }

  /**
   * Set custom select fields (mutually exclusive with include)
   */
  select(fields: Prisma.AppointmentSelect): this {
    this.selectOptions = fields;
    return this;
  }

  /**
   * Order by field
   */
  orderByField(
    field: keyof Prisma.AppointmentOrderByWithRelationInput,
    direction: 'asc' | 'desc' = 'asc',
  ): this {
    this.orderBy = { [field]: direction };
    return this;
  }

  /**
   * Limit results
   */
  take(limit: number): this {
    this.takeLimit = limit;
    return this;
  }

  /**
   * Skip results
   */
  skip(count: number): this {
    this.skipCount = count;
    return this;
  }

  /**
   * Add custom where conditions
   */
  addWhere(conditions: Prisma.AppointmentWhereInput): this {
    this.where = { ...this.where, ...conditions };
    return this;
  }

  /**
   * Build the final query object
   */
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

  /**
   * Build query for findMany
   */
  buildForFindMany() {
    return this.build();
  }

  /**
   * Build query for count
   */
  buildForCount(): { where: Prisma.AppointmentWhereInput } {
    return { where: this.where };
  }
}

/**
 * Query Builder for Patients
 */
export class PatientQueryBuilder {
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
      where: options?.upcoming ? { startTime: { gte: new Date() } } : undefined,
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

/**
 * Query Builder for Invoices
 */
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

  withStatus(...statuses: string[]): this {
    this.where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    return this;
  }

  unpaid(): this {
    return this.withStatus('pending', 'overdue');
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
