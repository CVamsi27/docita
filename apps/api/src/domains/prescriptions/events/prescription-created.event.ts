export class PrescriptionCreatedEvent {
  constructor(
    public readonly prescriptionId: string,
    public readonly clinicId: string,
  ) {}
}
