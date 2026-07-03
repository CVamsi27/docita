import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { IMedicalCodingRepository } from '@/domains/clinical/core/repositories/clinical.repository.interface';
import {
  LabOrderQueryParams,
  LabStats,
  type LabOrderRepository,
} from '@/domains/clinical/core/repositories/lab-order.repository.interface';
import type { LabTestCatalogRepository } from '@/domains/clinical/core/repositories/lab-test-catalog.repository.interface';
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

type LabTestCreateInput = {
  id?: string;
  name: string;
  category: string;
  clinicId: string;
  active?: boolean;
  code?: string;
  price?: number;
  description?: string;
};

type LabTestUpdateInput = Partial<Omit<LabTestCreateInput, 'id' | 'clinicId'>>;

type LabOrderCreateInput = {
  patientId: string;
  labTestId: string;
  clinicId: string;
  appointmentId?: string;
  labId?: string;
  orderedBy?: string;
};

/**
 * Facade — delegates lab tests and medical coding to ILabRepository / IMedicalCodingRepository.
 */
@Injectable()
export class ClinicalService {
  constructor(
    @Inject('LabTestCatalogRepository')
    private readonly labTestRepository: LabTestCatalogRepository,
    @Inject('LabOrderRepository')
    private readonly labOrderRepository: LabOrderRepository,
    @Inject('IMedicalCodingRepository')
    private readonly codingRepository: IMedicalCodingRepository,
    @Inject(CODE_CATALOG_PROVIDER)
    private readonly codeCatalogProvider: CodeCatalogProvider,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  private toLabTestInput(
    data: LabTestCreateInput,
  ): Parameters<typeof LabTest.create>[0] {
    return {
      id: data.id,
      name: data.name,
      category: data.category,
      clinicId: data.clinicId,
      active: data.active,
      code: data.code,
      price: data.price,
      description: data.description,
    };
  }

  async getAllTests(clinicId: string): Promise<LabTest[]> {
    return await this.labTestRepository.findAllTests(clinicId);
  }

  async getTestById(id: string): Promise<LabTest> {
    const test = await this.labTestRepository.findTestById(id);
    if (!test) throw new NotFoundException('Lab test not found');
    return test;
  }

  async createTest(data: LabTestCreateInput): Promise<LabTest> {
    const test = LabTest.create(this.toLabTestInput(data));
    return await this.labTestRepository.saveTest(test);
  }

  async updateTest(id: string, data: LabTestUpdateInput): Promise<LabTest> {
    const existing = await this.labTestRepository.findTestById(id);
    if (!existing) throw new NotFoundException('Lab test not found');

    const merged = LabTest.create({
      id: existing.id,
      clinicId: existing.clinicId,
      name: data.name ?? existing.name,
      category: data.category ?? existing.category,
      active: data.active ?? existing.active,
      code: data.code ?? existing.code,
      price: data.price ?? existing.price,
      description: data.description ?? existing.description,
    });
    return await this.labTestRepository.saveTest(merged);
  }

  async deleteTest(id: string): Promise<void> {
    const existing = await this.labTestRepository.findTestById(id);
    if (!existing) throw new NotFoundException('Lab test not found');
    await this.labTestRepository.deleteTest(id);
  }

  async getAllOrders(
    clinicId: string,
    params?: LabOrderQueryParams,
  ) {
    return await this.labOrderRepository.findAllOrders(clinicId, params);
  }

  async getOrderById(id: string): Promise<LabOrder> {
    const order = await this.labOrderRepository.findOrderById(id);
    if (!order) throw new NotFoundException('Lab order not found');
    return order;
  }

  async createOrder(data: LabOrderCreateInput): Promise<LabOrder> {
    const order = LabOrder.create({
      patientId: data.patientId,
      labTestId: data.labTestId,
      clinicId: data.clinicId,
      appointmentId: data.appointmentId,
      labId: data.labId,
      orderedBy: data.orderedBy,
      status: LabTestOrderStatus.ORDERED,
    });
    return await this.labOrderRepository.saveOrder(order);
  }

  async updateOrderStatus(
    id: string,
    status: LabTestOrderStatus,
  ): Promise<LabOrder> {
    const order = await this.labOrderRepository.findOrderById(id);
    if (!order) throw new NotFoundException('Lab order not found');

    const updated = order.update({ status }, this.clock.now());
    return await this.labOrderRepository.saveOrder(updated);
  }

  async getStats(clinicId: string): Promise<LabStats> {
    return await this.labOrderRepository.getStats(clinicId);
  }

  async searchIcdCodes(query: string): Promise<IcdCode[]> {
    return await this.codingRepository.searchIcdCodes(query, 20);
  }

  async searchCptCodes(query: string): Promise<CptCode[]> {
    return await this.codingRepository.searchCptCodes(query, 20);
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
