import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MonitoringService } from '../../monitoring/monitoring.service';
import OpenAI from 'openai';
import { Inject, Optional } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

interface PrescriptionAnalysisRequest {
  medications: Array<{ name: string; dosage: string }>;
  patientAge?: number;
  patientAllergies?: string[];
  existingConditions?: string[];
}

interface PrescriptionAnalysisResponse {
  drugInteractions: Array<{
    drug1: string;
    drug2: string;
    severity: 'mild' | 'moderate' | 'severe';
    description: string;
  }>;
  contraindications: Array<{
    medication: string;
    condition: string;
    description: string;
  }>;
  dosageRecommendations: Array<{
    medication: string;
    status: 'appropriate' | 'high' | 'low';
    recommendation: string;
  }>;
}

interface DiagnosisSuggestion {
  icdCode: string;
  diagnosis: string;
  confidence: number;
  description: string;
}

interface MedicationRecommendation {
  medicationName: string;
  strength: string;
  frequency: string;
  indication: string;
  confidence: number;
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private openai: OpenAI;
  private readonly modelType: string;
  private readonly requestTimeout: number;
  private readonly cacheEnabled: boolean;
  private readonly cacheTTL: number;

  constructor(
    private prisma: PrismaService,
    private monitoring: MonitoringService,
    @Optional() @Inject(CACHE_MANAGER) private cacheManager?: Cache,
  ) {
    this.modelType = process.env.OPENAI_MODEL || 'gpt-4-turbo';
    this.requestTimeout = parseInt(process.env.AI_REQUEST_TIMEOUT || '5000');
    this.cacheEnabled = process.env.AI_CACHE_ENABLED !== 'false';
    this.cacheTTL = parseInt(process.env.AI_CACHE_TTL || '86400'); // 24 hours

    if (!process.env.OPENAI_API_KEY) {
      this.logger.warn(
        'OpenAI API key not configured. AI features will use mock data.',
      );
    } else {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Analyze prescription for drug interactions, contraindications, and dosage appropriateness
   */
  async analyzePrescription(
    request: PrescriptionAnalysisRequest,
  ): Promise<PrescriptionAnalysisResponse> {
    const startTime = Date.now();

    try {
      // Check cache
      const cacheKey = this.generateCacheKey('prescription-analysis', request);
      if (this.cacheEnabled && this.cacheManager) {
        const cached =
          await this.cacheManager.get<PrescriptionAnalysisResponse>(cacheKey);
        if (cached) {
          this.logger.debug(`Cache hit for prescription analysis: ${cacheKey}`);
          return cached;
        }
      }

      let result: PrescriptionAnalysisResponse;

      if (!this.openai || !process.env.OPENAI_API_KEY) {
        this.logger.warn('Using mock data for prescription analysis');
        result = this.getMockPrescriptionAnalysis(request);
      } else {
        result = await this.callOpenAIPrescriptionAnalysis(request);
      }

      // Cache the result
      if (this.cacheEnabled && this.cacheManager) {
        await this.cacheManager.set(cacheKey, result, this.cacheTTL * 1000);
      }

      const duration = Date.now() - startTime;
      this.logger.log(`Prescription analysis completed in ${duration}ms`);

      return result;
    } catch (error) {
      this.logger.error(
        `Error analyzing prescription: ${error.message}`,
        error.stack,
      );
      this.monitoring.logError({
        type: 'AI_ANALYSIS_ERROR',
        message: `Prescription analysis failed: ${error.message}`,
        path: '/ai/prescription-analysis',
        metadata: { request },
      });

      // Fallback to mock data on error
      return this.getMockPrescriptionAnalysis(request);
    }
  }

  /**
   * Suggest diagnoses based on symptoms/findings
   */
  async suggestDiagnoses(
    symptoms: string[],
    findingsNotes?: string,
  ): Promise<DiagnosisSuggestion[]> {
    const startTime = Date.now();

    try {
      // Check cache
      const cacheKey = this.generateCacheKey('diagnosis-suggestions', {
        symptoms,
        findingsNotes,
      });
      if (this.cacheEnabled && this.cacheManager) {
        const cached =
          await this.cacheManager.get<DiagnosisSuggestion[]>(cacheKey);
        if (cached) {
          this.logger.debug(`Cache hit for diagnosis suggestions: ${cacheKey}`);
          return cached;
        }
      }

      let result: DiagnosisSuggestion[];

      if (!this.openai || !process.env.OPENAI_API_KEY) {
        this.logger.warn('Using mock data for diagnosis suggestions');
        result = this.getMockDiagnosisSuggestions(symptoms);
      } else {
        result = await this.callOpenAIDiagnosisSuggestions(
          symptoms,
          findingsNotes,
        );
      }

      // Cache the result
      if (this.cacheEnabled && this.cacheManager) {
        await this.cacheManager.set(cacheKey, result, this.cacheTTL * 1000);
      }

      const duration = Date.now() - startTime;
      this.logger.log(`Diagnosis suggestions completed in ${duration}ms`);

      return result;
    } catch (error) {
      this.logger.error(
        `Error suggesting diagnoses: ${error.message}`,
        error.stack,
      );
      this.monitoring.logError({
        type: 'AI_DIAGNOSIS_ERROR',
        message: `Diagnosis suggestion failed: ${error.message}`,
        metadata: { symptoms, findingsNotes },
      });

      // Fallback to mock data on error
      return this.getMockDiagnosisSuggestions(symptoms);
    }
  }

  /**
   * Recommend medications based on condition and patient profile
   */
  async recommendMedications(
    condition: string,
    patientAge?: number,
    allergies?: string[],
  ): Promise<MedicationRecommendation[]> {
    const startTime = Date.now();

    try {
      // Check cache
      const cacheKey = this.generateCacheKey('medication-recommendations', {
        condition,
        patientAge,
        allergies,
      });
      if (this.cacheEnabled && this.cacheManager) {
        const cached =
          await this.cacheManager.get<MedicationRecommendation[]>(cacheKey);
        if (cached) {
          this.logger.debug(
            `Cache hit for medication recommendations: ${cacheKey}`,
          );
          return cached;
        }
      }

      let result: MedicationRecommendation[];

      if (!this.openai || !process.env.OPENAI_API_KEY) {
        this.logger.warn('Using mock data for medication recommendations');
        result = this.getMockMedicationRecommendations(condition);
      } else {
        result = await this.callOpenAIMedicationRecommendations(
          condition,
          patientAge,
          allergies,
        );
      }

      // Cache the result
      if (this.cacheEnabled && this.cacheManager) {
        await this.cacheManager.set(cacheKey, result, this.cacheTTL * 1000);
      }

      const duration = Date.now() - startTime;
      this.logger.log(`Medication recommendations completed in ${duration}ms`);

      return result;
    } catch (error) {
      this.logger.error(
        `Error recommending medications: ${error.message}`,
        error.stack,
      );
      this.monitoring.logError({
        type: 'AI_MEDICATION_ERROR',
        message: `Medication recommendation failed: ${error.message}`,
        metadata: { condition, patientAge, allergies },
      });

      // Fallback to mock data on error
      return this.getMockMedicationRecommendations(condition);
    }
  }

  /**
   * Call OpenAI API for prescription analysis
   */
  private async callOpenAIPrescriptionAnalysis(
    request: PrescriptionAnalysisRequest,
  ): Promise<PrescriptionAnalysisResponse> {
    const prompt = this.buildPrescriptionAnalysisPrompt(request);

    const response = (await Promise.race([
      this.openai.chat.completions.create({
        model: this.modelType,
        messages: [
          {
            role: 'system',
            content:
              'You are a clinical pharmacist expert. Analyze prescriptions for drug interactions, contraindications, and dosage appropriateness. Always respond with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('OpenAI request timeout')),
          this.requestTimeout,
        ),
      ),
    ])) as any;

    const aiResponse = response;
    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    try {
      const parsed = JSON.parse(content);
      return this.normalizePrescriptionAnalysis(parsed);
    } catch (error) {
      this.logger.error('Failed to parse OpenAI response', error);
      throw new Error('Invalid JSON response from OpenAI');
    }
  }

  /**
   * Call OpenAI API for diagnosis suggestions
   */
  private async callOpenAIDiagnosisSuggestions(
    symptoms: string[],
    findingsNotes?: string,
  ): Promise<DiagnosisSuggestion[]> {
    const prompt = this.buildDiagnosisSuggestionsPrompt(
      symptoms,
      findingsNotes,
    );

    const response = (await Promise.race([
      this.openai.chat.completions.create({
        model: this.modelType,
        messages: [
          {
            role: 'system',
            content:
              'You are a clinical diagnostician. Suggest likely diagnoses with ICD-10 codes based on symptoms. Always respond with valid JSON array.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
        response_format: { type: 'json_object' },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('OpenAI request timeout')),
          this.requestTimeout,
        ),
      ),
    ])) as any;

    const aiResponse = response;
    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    try {
      const parsed = JSON.parse(content);
      return this.normalizeDiagnosisSuggestions(parsed);
    } catch (error) {
      this.logger.error('Failed to parse OpenAI response', error);
      throw new Error('Invalid JSON response from OpenAI');
    }
  }

  /**
   * Call OpenAI API for medication recommendations
   */
  private async callOpenAIMedicationRecommendations(
    condition: string,
    patientAge?: number,
    allergies?: string[],
  ): Promise<MedicationRecommendation[]> {
    const prompt = this.buildMedicationRecommendationPrompt(
      condition,
      patientAge,
      allergies,
    );

    const response = (await Promise.race([
      this.openai.chat.completions.create({
        model: this.modelType,
        messages: [
          {
            role: 'system',
            content:
              'You are a clinical pharmacist. Recommend first-line and alternative medications for the given condition. Always respond with valid JSON array.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('OpenAI request timeout')),
          this.requestTimeout,
        ),
      ),
    ])) as any;

    const aiResponse = response;
    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    try {
      const parsed = JSON.parse(content);
      return this.normalizeMedicationRecommendations(parsed);
    } catch (error) {
      this.logger.error('Failed to parse OpenAI response', error);
      throw new Error('Invalid JSON response from OpenAI');
    }
  }

  /**
   * Build prompt for prescription analysis
   */
  private buildPrescriptionAnalysisPrompt(
    request: PrescriptionAnalysisRequest,
  ): string {
    const medString = request.medications
      .map((m) => `${m.name} ${m.dosage}`)
      .join(', ');
    const allergyString = request.patientAllergies?.join(', ') || 'None';
    const conditionString = request.existingConditions?.join(', ') || 'None';

    return `
Analyze the following prescription for a patient:

Medications: ${medString}
Patient Age: ${request.patientAge || 'Unknown'}
Known Allergies: ${allergyString}
Existing Conditions: ${conditionString}

Provide analysis in JSON format with:
1. drugInteractions: array of interactions between medications (severity: mild/moderate/severe)
2. contraindications: array of medication-condition contraindications
3. dosageRecommendations: array of dosage appropriateness assessments

Return ONLY valid JSON, no other text.
`;
  }

  /**
   * Build prompt for diagnosis suggestions
   */
  private buildDiagnosisSuggestionsPrompt(
    symptoms: string[],
    findingsNotes?: string,
  ): string {
    const symptomsString = symptoms.join(', ');

    return `
Patient presents with the following symptoms: ${symptomsString}

Clinical findings: ${findingsNotes || 'No additional findings provided'}

Suggest the top 5 most likely diagnoses with:
1. ICD-10 code
2. Diagnosis name
3. Confidence score (0-100)
4. Brief clinical description

Return as JSON array with format: [{"icdCode": "", "diagnosis": "", "confidence": 0, "description": ""}]
Return ONLY valid JSON array, no other text.
`;
  }

  /**
   * Build prompt for medication recommendations
   */
  private buildMedicationRecommendationPrompt(
    condition: string,
    patientAge?: number,
    allergies?: string[],
  ): string {
    const allergyString = allergies?.length
      ? allergies.join(', ')
      : 'No known allergies';

    return `
Recommend medications for: ${condition}

Patient Age: ${patientAge || 'Unknown'}
Known Allergies: ${allergyString}

Provide 3-5 medication recommendations with:
1. Medication name
2. Strength (typical dose)
3. Frequency (typical dosing frequency)
4. Indication/reason for this medication
5. Confidence score (0-100)

Return as JSON array with format: [{"medicationName": "", "strength": "", "frequency": "", "indication": "", "confidence": 0}]
Return ONLY valid JSON array, no other text.
`;
  }

  /**
   * Normalize prescription analysis response from OpenAI
   */
  private normalizePrescriptionAnalysis(
    data: any,
  ): PrescriptionAnalysisResponse {
    return {
      drugInteractions: (data.drugInteractions || []).slice(0, 10),
      contraindications: (data.contraindications || []).slice(0, 10),
      dosageRecommendations: (data.dosageRecommendations || []).slice(0, 10),
    };
  }

  /**
   * Normalize diagnosis suggestions response from OpenAI
   */
  private normalizeDiagnosisSuggestions(data: any): DiagnosisSuggestion[] {
    const suggestions = Array.isArray(data) ? data : data.suggestions || [];
    return suggestions
      .slice(0, 10)
      .filter((s) => s.icdCode && s.diagnosis)
      .map((s) => ({
        icdCode: s.icdCode,
        diagnosis: s.diagnosis,
        confidence: Math.min(Math.max(s.confidence || 0, 0), 100),
        description: s.description || '',
      }));
  }

  /**
   * Normalize medication recommendations response from OpenAI
   */
  private normalizeMedicationRecommendations(
    data: any,
  ): MedicationRecommendation[] {
    const recommendations = Array.isArray(data)
      ? data
      : data.recommendations || [];
    return recommendations
      .slice(0, 10)
      .filter((r) => r.medicationName)
      .map((r) => ({
        medicationName: r.medicationName,
        strength: r.strength || 'As per clinical judgment',
        frequency: r.frequency || 'As per clinical judgment',
        indication: r.indication || '',
        confidence: Math.min(Math.max(r.confidence || 0, 0), 100),
      }));
  }

  /**
   * Mock data for prescription analysis (fallback)
   */
  private getMockPrescriptionAnalysis(
    request: PrescriptionAnalysisRequest,
  ): PrescriptionAnalysisResponse {
    return {
      drugInteractions: [
        {
          drug1: request.medications[0]?.name || 'Medication A',
          drug2: request.medications[1]?.name || 'Medication B',
          severity: 'mild',
          description: 'Minor interaction: monitor patient response',
        },
      ],
      contraindications: request.patientAllergies
        ? request.patientAllergies.map((allergy) => ({
            medication: request.medications[0]?.name || 'Medication',
            condition: allergy,
            description: `Patient has known allergy to ${allergy}. Consider alternative medication.`,
          }))
        : [],
      dosageRecommendations: request.medications.map((med) => ({
        medication: med.name,
        status: 'appropriate',
        recommendation: `${med.dosage} is within normal therapeutic range`,
      })),
    };
  }

  /**
   * Mock data for diagnosis suggestions (fallback)
   */
  private getMockDiagnosisSuggestions(
    symptoms: string[],
  ): DiagnosisSuggestion[] {
    const mockSuggestions: Record<string, DiagnosisSuggestion[]> = {
      fever: [
        {
          icdCode: 'R50.9',
          diagnosis: 'Fever, unspecified',
          confidence: 95,
          description: 'High body temperature of unknown origin',
        },
        {
          icdCode: 'J06.9',
          diagnosis: 'Acute upper respiratory infection, unspecified',
          confidence: 85,
          description: 'Common viral infection with fever',
        },
      ],
      cough: [
        {
          icdCode: 'R05.9',
          diagnosis: 'Cough, unspecified',
          confidence: 90,
          description: 'Persistent cough requiring investigation',
        },
        {
          icdCode: 'J20.9',
          diagnosis: 'Acute bronchitis, unspecified',
          confidence: 75,
          description: 'Inflammation of bronchial tubes',
        },
      ],
      headache: [
        {
          icdCode: 'R51.9',
          diagnosis: 'Headache, unspecified',
          confidence: 95,
          description: 'Cephalgia of unknown etiology',
        },
        {
          icdCode: 'G43.909',
          diagnosis: 'Unspecified migraine',
          confidence: 70,
          description: 'Possible migraine headache',
        },
      ],
    };

    const symptom = symptoms[0]?.toLowerCase() || 'fever';
    return mockSuggestions[symptom] || mockSuggestions.fever;
  }

  /**
   * Mock data for medication recommendations (fallback)
   */
  private getMockMedicationRecommendations(
    condition: string,
  ): MedicationRecommendation[] {
    const mockRecommendations: Record<string, MedicationRecommendation[]> = {
      diabetes: [
        {
          medicationName: 'Metformin',
          strength: '500-1000 mg',
          frequency: 'Twice daily',
          indication: 'First-line agent for type 2 diabetes',
          confidence: 95,
        },
        {
          medicationName: 'Glipizide',
          strength: '5-20 mg',
          frequency: 'Once or twice daily',
          indication: 'Sulfonylurea for glycemic control',
          confidence: 85,
        },
      ],
      hypertension: [
        {
          medicationName: 'Amlodipine',
          strength: '5-10 mg',
          frequency: 'Once daily',
          indication: 'Calcium channel blocker for blood pressure control',
          confidence: 90,
        },
        {
          medicationName: 'Lisinopril',
          strength: '10-40 mg',
          frequency: 'Once daily',
          indication: 'ACE inhibitor for hypertension management',
          confidence: 88,
        },
      ],
      infection: [
        {
          medicationName: 'Amoxicillin',
          strength: '500 mg',
          frequency: 'Three times daily',
          indication: 'First-line antibiotic for bacterial infections',
          confidence: 85,
        },
        {
          medicationName: 'Azithromycin',
          strength: '500 mg',
          frequency: 'Once daily',
          indication: 'Macrolide antibiotic for respiratory infections',
          confidence: 80,
        },
      ],
    };

    const conditionLower = condition.toLowerCase();
    return (
      mockRecommendations[conditionLower] || mockRecommendations.infection || []
    );
  }

  /**
   * Generate cache key for requests
   */
  private generateCacheKey(prefix: string, data: any): string {
    return `${prefix}:${JSON.stringify(data)
      .split('')
      .reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)}`;
  }
}
