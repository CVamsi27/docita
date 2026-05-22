import { InvariantViolationError } from '@/shared/common/errors/domain.errors';

export class LabTest {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly category: string,
    public readonly clinicId: string,
    public readonly active: boolean = true,
    public readonly code?: string,
    public readonly price?: number,
    public readonly description?: string,
  ) {}

  static create(props: {
    id?: string;
    name: string;
    category: string;
    clinicId: string;
    active?: boolean;
    code?: string;
    price?: number;
    description?: string;
  }): LabTest {
    if (!props.name) {
      throw new InvariantViolationError('Lab test name is required');
    }
    if (!props.category) {
      throw new InvariantViolationError('Lab test category is required');
    }
    if (!props.clinicId) {
      throw new InvariantViolationError('Clinic ID is required');
    }

    return new LabTest(
      props.id || '',
      props.name,
      props.category,
      props.clinicId,
      props.active ?? true,
      props.code,
      props.price,
      props.description,
    );
  }
}
