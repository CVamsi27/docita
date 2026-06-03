import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Tier } from '@workspace/types';
import { mapDbClinicTierStringToTierName } from '@workspace/types';
import { meetsMinimumTier } from '@workspace/utils';
import type { UpdateClinicAIFeaturesDto, TierName } from '@workspace/types';

@Injectable()
export class InternalAiService {
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

    const tierName = mapDbClinicTierStringToTierName(clinic.tier) as TierName;
    if (!meetsMinimumTier(tierName, Tier.PROFESSIONAL)) {
      throw new BadRequestException(
        'AI features are only available for PROFESSIONAL, HOSPITAL, or ENTERPRISE tiers.',
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
          availableIn: ['PROFESSIONAL', 'ENTERPRISE'],
          icon: 'activity',
        },
        {
          id: 'automatedDiagnosis',
          name: 'Automated Diagnosis Assistant',
          description: 'AI-powered suggestions for diagnosis.',
          availableIn: ['PROFESSIONAL', 'ENTERPRISE'],
          icon: 'microscope',
        },
        {
          id: 'patientInsights',
          name: 'Patient Health Insights',
          description: 'Deep insights into patient health metrics.',
          availableIn: ['PROFESSIONAL', 'ENTERPRISE'],
          icon: 'pie-chart',
        },
        {
          id: 'appointmentOptimization',
          name: 'Appointment Optimization',
          description: 'AI-optimized scheduling.',
          availableIn: ['ESSENTIAL', 'PROFESSIONAL', 'ENTERPRISE'],
          icon: 'calendar',
        },
        {
          id: 'prescriptionAssistant',
          name: 'Smart Prescription Assistant',
          description: 'AI-assisted prescription generation.',
          availableIn: ['PROFESSIONAL', 'ENTERPRISE'],
          icon: 'pill',
        },
      ],
    };
  }
}
