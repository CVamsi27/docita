import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import {
  ILabRepository,
  IMedicalCodingRepository,
  LabOrderQueryParams,
  LabStats,
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

type LabOrderCreateInput = {
  patientId: string;
  labTestId: string;
  clinicId: string;
  appointmentId?: string;
};

@Injectable()
export class ClinicalService {
  constructor(
    @Inject('ILabRepository')
    private readonly labRepository: ILabRepository,
    @Inject('IMedicalCodingRepository')
    private readonly codingRepository: IMedicalCodingRepository,
    @Inject(CODE_CATALOG_PROVIDER)
    private readonly codeCatalogProvider: CodeCatalogProvider,
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
    return await this.labRepository.findAllTests(clinicId);
  }

  async getTestById(id: string): Promise<LabTest> {
    const test = await this.labRepository.findTestById(id);
    if (!test) throw new NotFoundException('Lab test not found');
    return test;
  }

  async createTest(data: LabTestCreateInput): Promise<LabTest> {
    const test = LabTest.create(this.toLabTestInput(data));
    return await this.labRepository.saveTest(test);
  }

  async getAllOrders(
    clinicId: string,
    params?: LabOrderQueryParams,
  ): Promise<LabOrder[]> {
    const orders = await this.labRepository.findAllOrders(clinicId, params);
    return orders;
  }

  async getOrderById(id: string): Promise<LabOrder> {
    const order = await this.labRepository.findOrderById(id);
    if (!order) throw new NotFoundException('Lab order not found');
    return order;
  }

  async createOrder(data: LabOrderCreateInput): Promise<LabOrder> {
    const order = LabOrder.create({
      patientId: data.patientId,
      labTestId: data.labTestId,
      clinicId: data.clinicId,
      appointmentId: data.appointmentId,
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

  async getStats(clinicId: string): Promise<LabStats> {
    return await this.labRepository.getStats(clinicId);
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
