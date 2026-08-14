import { MetricRecordSource, Prisma } from '@workspace/db';

export type MetricRecordRow = {
  id: string;
  clinicId: string;
  patientId: string;
  definitionId: string;
  appointmentId: string | null;
  recordedAt: Date;
  recordedById: string | null;
  source: MetricRecordSource;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  definition: {
    category: {
      key: string;
    };
  };
  values: Array<{
    id: string;
    metricRecordId: string;
    valueString: string | null;
    valueNumber: number | null;
    valueBoolean: boolean | null;
    valueDate: Date | null;
    valueJson: Prisma.JsonValue | null;
    optionId: string | null;
    option: {
      id: string;
      value: string;
      label: string;
    } | null;
  }>;
};
