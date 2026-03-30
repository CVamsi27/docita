import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import {
  ILabRepository,
  IMedicalCodingRepository,
} from '@/domains/clinical/core/repositories/clinical.repository.interface';
import {
  CODE_CATALOG_PROVIDER,
  CodeCatalogProvider,
} from '@/domains/clinical/core/providers/code-catalog.provider';
import { LabTest } from '@/domains/clinical/core/entities/lab-test.entity';
import { LabOrder } from '@/domains/clinical/core/entities/lab-order.entity';
import {
  LabTestOrderStatus,
  IcdCode,
  CptCode,
  DoctorFavoriteCode,
  Appointment,
} from '@workspace/db';

@Injectable()
export class ClinicalService {
  private readString(
    source: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const value = source[key];
    return typeof value === 'string' ? value : undefined;
  }
  constructor(
    @Inject('ILabRepository')
    private readonly labRepository: ILabRepository,
    @Inject('IMedicalCodingRepository')
    private readonly codingRepository: IMedicalCodingRepository,
    @Inject(CODE_CATALOG_PROVIDER)
    private readonly codeCatalogProvider: CodeCatalogProvider,
  ) {}

  private toLabTestInput(
    data: Record<string, unknown>,
  ): Parameters<typeof LabTest.create>[0] {
    return {
      id: typeof data.id === 'string' ? data.id : undefined,
      name: typeof data.name === 'string' ? data.name : '',
      category: typeof data.category === 'string' ? data.category : '',
      clinicId: typeof data.clinicId === 'string' ? data.clinicId : '',
      active: typeof data.active === 'boolean' ? data.active : undefined,
      code: typeof data.code === 'string' ? data.code : undefined,
      price: typeof data.price === 'number' ? data.price : undefined,
      description:
        typeof data.description === 'string' ? data.description : undefined,
    };
  }

  async getAllTests(clinicId: string): Promise<LabTest[]> {
    return await this.labRepository.findAllTests(clinicId);
  }

  async getTestById(id: string): Promise<LabTest> {
    const test = await this.labRepository.findTestById(id);
    if (!test) throw new NotFoundException('Lab test not found');
    return test;
  }

  async createTest(data: Record<string, unknown>): Promise<LabTest> {
    const test = LabTest.create(this.toLabTestInput(data));
    return await this.labRepository.saveTest(test);
  }

  async getAllOrders(
    clinicId: string,
    params?: Record<string, unknown>,
  ): Promise<LabOrder[]> {
    const orders = await this.labRepository.findAllOrders(clinicId, params);
    return orders;
  }

  async getOrderById(id: string): Promise<LabOrder> {
    const order = await this.labRepository.findOrderById(id);
    if (!order) throw new NotFoundException('Lab order not found');
    return order;
  }

  async createOrder(data: Record<string, unknown>): Promise<LabOrder> {
    const patientId = this.readString(data, 'patientId');
    const labTestId = this.readString(data, 'labTestId');
    const clinicId = this.readString(data, 'clinicId');
    if (!patientId || !labTestId || !clinicId) {
      throw new NotFoundException('Missing required fields for lab order');
    }
    const order = LabOrder.create({
      patientId,
      labTestId,
      clinicId,
      appointmentId: this.readString(data, 'appointmentId'),
      status: LabTestOrderStatus.ORDERED,
    });
    return await this.labRepository.saveOrder(order);
  }

  async updateOrderStatus(
    id: string,
    status: LabTestOrderStatus,
  ): Promise<LabOrder> {
    const order = await this.labRepository.findOrderById(id);
    if (!order) throw new NotFoundException('Lab order not found');

    const updated = order.update({ status });
    return await this.labRepository.saveOrder(updated);
  }

  async getStats(clinicId: string): Promise<Record<string, number>> {
    return await this.labRepository.getStats(clinicId);
  }

  async searchIcdCodes(query: string): Promise<IcdCode[]> {
    return await this.codeCatalogProvider.searchIcdCodes(query);
  }

  async searchCptCodes(query: string): Promise<CptCode[]> {
    return await this.codeCatalogProvider.searchCptCodes(query);
  }

  async getFavorites(userId: string): Promise<(IcdCode | null)[]> {
    return await this.codingRepository.getFavorites(userId);
  }

  async getCommonIcdCodes(limit = 50): Promise<IcdCode[]> {
    return await this.codingRepository.getCommonIcdCodes(limit);
  }

  async addFavorite(
    userId: string,
    code: string,
    description: string,
    category: string,
  ): Promise<DoctorFavoriteCode> {
    return await this.codingRepository.addFavorite(
      userId,
      code,
      description,
      category,
    );
  }

  async removeFavorite(userId: string, icdCodeId: string): Promise<void> {
    return await this.codingRepository.removeFavorite(userId, icdCodeId);
  }

  async getCptFavorites(userId: string): Promise<(CptCode | null)[]> {
    return await this.codingRepository.getCptFavorites(userId);
  }

  async getCommonCptCodes(limit = 50): Promise<CptCode[]> {
    return await this.codingRepository.getCommonCptCodes(limit);
  }

  async addCptFavorite(
    userId: string,
    code: string,
    description: string,
    category: string,
  ): Promise<DoctorFavoriteCode> {
    return await this.codingRepository.addCptFavorite(
      userId,
      code,
      description,
      category,
    );
  }

  async removeCptFavorite(userId: string, cptCodeId: string): Promise<void> {
    return await this.codingRepository.removeCptFavorite(userId, cptCodeId);
  }

  async getUncodedVisits(
    clinicId: string,
    search?: string,
  ): Promise<Appointment[]> {
    return await this.codingRepository.getUncodedVisits(clinicId, search);
  }
}
