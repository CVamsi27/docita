import { Injectable } from '@nestjs/common';
import { ClinicTier, ClinicType } from '@workspace/db';
import { ClinicSearchResult } from '@/domains/clinics/core/repositories/clinic-data.repository.interface';
import { ClinicDataCommandService } from './clinic-data-command.service';
import { ClinicDataQueryService } from './clinic-data-query.service';

/**
 * Facade — delegates clinic CRUD and lookup to command/query services.
 */
@Injectable()
export class ClinicDataService {
  constructor(
    private readonly queryService: ClinicDataQueryService,
    private readonly commandService: ClinicDataCommandService,
  ) {}

  create(data: {
    name: string;
    address: string;
    phone: string;
    email: string;
    logo?: string;
    tier?: ClinicTier;
    type?: ClinicType;
    settings?: unknown;
  }) {
    return this.commandService.create(data);
  }

  findAll() {
    return this.queryService.findAll();
  }

  findOne(id: string) {
    return this.queryService.findOne(id);
  }

  update(
    id: string,
    data: Parameters<ClinicDataCommandService['update']>[1],
  ) {
    return this.commandService.update(id, data);
  }

  delete(id: string) {
    return this.commandService.delete(id);
  }

  getUserClinics(userId: string) {
    return this.queryService.getUserClinics(userId);
  }

  getClinicStats(clinicId: string) {
    return this.queryService.getClinicStats(clinicId);
  }

  joinClinicForUser(
    userId: string,
    data: Parameters<ClinicDataCommandService['joinClinicForUser']>[1],
  ) {
    return this.commandService.joinClinicForUser(userId, data);
  }

  searchActive(query: string): Promise<ClinicSearchResult[]> {
    return this.queryService.searchActive(query);
  }
}
