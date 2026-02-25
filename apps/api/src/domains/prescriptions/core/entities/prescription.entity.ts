export class Medication {
  constructor(
    public readonly name: string,
    public readonly dosage: string,
    public readonly frequency: string,
    public readonly duration: string,
    public readonly route?: string,
  ) {}
}

export class Prescription {
  constructor(
    public readonly id: string,
    public readonly patientId: string,
    public readonly doctorId: string,
    public readonly medications: Medication[],
    public readonly appointmentId?: string,
    public readonly instructions?: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  static create(props: {
    id?: string;
    patientId: string;
    doctorId: string;
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      route?: string;
    }>;
    appointmentId?: string;
    instructions?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }): Prescription {
    if (!props.patientId) throw new Error('Patient ID is required');
    if (!props.doctorId) throw new Error('Doctor ID is required');
    if (!props.medications || props.medications.length === 0) {
      throw new Error('At least one medication is required');
    }

    const meds = props.medications.map(
      (m) => new Medication(m.name, m.dosage, m.frequency, m.duration, m.route),
    );

    return new Prescription(
      props.id || '',
      props.patientId,
      props.doctorId,
      meds,
      props.appointmentId,
      props.instructions,
      props.createdAt,
      props.updatedAt,
    );
  }
}
