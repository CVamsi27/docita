import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import {
  ILabRepository,
  IMedicalCodingRepository,
} from '../../core/repositories/clinical.repository.interface';
import { LabTest } from '../../core/entities/lab-test.entity';
import { LabOrder } from '../../core/entities/lab-order.entity';
import {
  LabTestOrderStatus,
  IcdCode,
  CptCode,
  DoctorFavoriteCode,
  Appointment,
} from '@workspace/db';

@Injectable()
export class ClinicalService {
  constructor(
    @Inject('ILabRepository')
    private readonly labRepository: ILabRepository,
    @Inject('IMedicalCodingRepository')
    private readonly codingRepository: IMedicalCodingRepository,
  ) {}

  async getAllTests(clinicId: string): Promise<LabTest[]> {
    return await this.labRepository.findAllTests(clinicId);
  }

  async getTestById(id: string): Promise<LabTest> {
    const test = await this.labRepository.findTestById(id);
    if (!test) throw new NotFoundException('Lab test not found');
    return test;
  }

  async createTest(data: Record<string, unknown>): Promise<LabTest> {
    const test = LabTest.create(data as any);
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
    const order = LabOrder.create({
      patientId: data.patientId as string,
      labTestId: data.labTestId as string,
      clinicId: data.clinicId as string,
      appointmentId: data.appointmentId as string,
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
    return await this.codingRepository.searchIcdCodes(query);
  }

  async searchCptCodes(query: string): Promise<CptCode[]> {
    return await this.codingRepository.searchCptCodes(query);
  }

  async getFavorites(userId: string): Promise<(IcdCode | null)[]> {
    return await this.codingRepository.getFavorites(userId);
  }

  async addFavorite(
    userId: string,
    icdCodeId: string,
  ): Promise<DoctorFavoriteCode> {
    return await this.codingRepository.addFavorite(userId, icdCodeId);
  }

  async removeFavorite(userId: string, icdCodeId: string): Promise<void> {
    return await this.codingRepository.removeFavorite(userId, icdCodeId);
  }

  async getCptFavorites(userId: string): Promise<(CptCode | null)[]> {
    return await this.codingRepository.getCptFavorites(userId);
  }

  async addCptFavorite(
    userId: string,
    cptCodeId: string,
  ): Promise<DoctorFavoriteCode> {
    return await this.codingRepository.addCptFavorite(userId, cptCodeId);
  }

  async removeCptFavorite(userId: string, cptCodeId: string): Promise<void> {
    return await this.codingRepository.removeCptFavorite(userId, cptCodeId);
  }

  async getUncodedVisits(clinicId: string, search?: string): Promise<any[]> {
    return await this.codingRepository.getUncodedVisits(clinicId, search);
  }
}
