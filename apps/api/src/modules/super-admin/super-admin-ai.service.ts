import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpdateClinicAIFeaturesDto } from '@workspace/types';

@Injectable()
export class SuperAdminAiService {
  constructor(private prisma: PrismaService) {}

  async getClinicAIFeatures(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        id: true,
        name: true,
        tier: true,
        intelligenceAddon: true,
        features: true,
      },
    });

    if (!clinic) throw new BadRequestException('Clinic not found');

    return {
      clinicId: clinic.id,
      clinicName: clinic.name,
      tier: clinic.tier,
      aiEnabled: clinic.intelligenceAddon === 'ACTIVE',
      features: clinic.features || {
        predictiveAnalytics: false,
        automatedDiagnosis: false,
        patientInsights: false,
        appointmentOptimization: false,
        prescriptionAssistant: false,
      },
    };
  }

  async updateClinicAIFeatures(
    clinicId: string,
    data: UpdateClinicAIFeaturesDto,
  ) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });
    if (!clinic) throw new BadRequestException('Clinic not found');

    return this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        intelligenceAddon: data.enabled ? 'ACTIVE' : 'NONE',
        features: data.features ? data.features : clinic.features || {},
      },
    });
  }

  async enableAIFeatures(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });
    if (!clinic) throw new BadRequestException('Clinic not found');

    const allowedTiers = ['PRO', 'ENTERPRISE'];
    if (!allowedTiers.includes(clinic.tier)) {
      throw new BadRequestException(
        `AI features are only available for ${allowedTiers.join(', ')} tiers.`,
      );
    }

    return this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        intelligenceAddon: 'ACTIVE',
        features: {
          predictiveAnalytics: true,
          automatedDiagnosis: true,
          patientInsights: true,
          appointmentOptimization: true,
          prescriptionAssistant: true,
        },
      },
    });
  }

  async disableAIFeatures(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });
    if (!clinic) throw new BadRequestException('Clinic not found');

    return this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        intelligenceAddon: 'NONE',
        features: {
          predictiveAnalytics: false,
          automatedDiagnosis: false,
          patientInsights: false,
          appointmentOptimization: false,
          prescriptionAssistant: false,
        },
      },
    });
  }

  getAIFeaturesCatalog() {
    return {
      aiFeatures: [
        {
          id: 'predictiveAnalytics',
          name: 'Predictive Analytics',
          description: 'Analyze patient patterns and predict health trends.',
          availableIn: ['PRO', 'ENTERPRISE'],
          icon: 'activity',
        },
        {
          id: 'automatedDiagnosis',
          name: 'Automated Diagnosis Assistant',
          description: 'AI-powered suggestions for diagnosis.',
          availableIn: ['PRO', 'ENTERPRISE'],
          icon: 'microscope',
        },
        {
          id: 'patientInsights',
          name: 'Patient Health Insights',
          description: 'Deep insights into patient health metrics.',
          availableIn: ['PRO', 'ENTERPRISE'],
          icon: 'pie-chart',
        },
        {
          id: 'appointmentOptimization',
          name: 'Appointment Optimization',
          description: 'AI-optimized scheduling.',
          availableIn: ['PLUS', 'PRO', 'ENTERPRISE'],
          icon: 'calendar',
        },
        {
          id: 'prescriptionAssistant',
          name: 'Smart Prescription Assistant',
          description: 'AI-assisted prescription generation.',
          availableIn: ['PRO', 'ENTERPRISE'],
          icon: 'pill',
        },
      ],
    };
  }
}
