import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MonitoringService } from '../../monitoring/monitoring.service';
import OpenAI from 'openai';
import { Inject, Optional } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as fs from 'fs';

// ============================================================================
// OCR Interfaces
// ============================================================================

interface OcrExtractedFields {
  // Patient Information
  firstName: string;
  lastName: string;
  age?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  phoneNumber?: string;
  email?: string;
  bloodType?: string;

  // Clinical Data
  diagnosis?: string;
  symptoms?: string[];
  medicalHistory?: string[];
  allergies?: string[];

  // Vitals
  vitals?: {
    bp?: string;
    temp?: string;
    pulse?: string;
    respiratoryRate?: string;
    spO2?: string;
    glucose?: string;
  };

  // Medications
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    route: string;
    duration: string;
  }>;

  // Document Metadata
  doctorName?: string;
  visitDate?: string;

  // Confidence scores per field
  fieldConfidence: Record<string, number>;
}

interface OcrExtractionResult {
  text: string;
  documentType: 'PRESCRIPTION' | 'CASE_SHEET' | 'LAB_REPORT' | 'GENERAL';
  confidence: number;
  fields: OcrExtractedFields;
  suggestedCorrections?: Record<string, any>;
}

interface FieldConfidenceConfig {
  medicalFields: number;
  contactFields: number;
  vitalFields: number;
}

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

  // ============================================================================
  // OCR Vision Processing Methods
  // ============================================================================

  /**
   * Extract text and structured data from medical document image using Vision API
   * @param imagePath Path to uploaded image file
   * @param hasAiSubscription Whether clinic has AI subscription
   */
  async extractFromMedicalDocument(
    imagePath: string,
    hasAiSubscription: boolean = false,
  ): Promise<OcrExtractionResult> {
    const startTime = Date.now();

    try {
      // Step 1: Extract raw text from image
      const rawText = await this.extractTextFromImage(imagePath);

      // Step 2: Parse text into structured fields
      const extractedFields = await this.parseOcrText(
        rawText,
        hasAiSubscription,
      );

      // Step 3: Detect document type (if AI enabled)
      const documentType = hasAiSubscription
        ? await this.detectDocumentType(rawText)
        : 'GENERAL';

      // Step 4: Generate AI suggestions (if AI enabled)
      const suggestedCorrections = hasAiSubscription
        ? await this.generateFieldSuggestions(extractedFields)
        : undefined;

      // Step 5: Calculate overall confidence
      const confidence = this.calculateOverallConfidence(
        extractedFields.fieldConfidence,
      );

      const duration = Date.now() - startTime;
      this.logger.log(`OCR extraction completed in ${duration}ms`);

      return {
        text: rawText,
        documentType,
        confidence,
        fields: extractedFields,
        suggestedCorrections,
      };
    } catch (error) {
      this.logger.error(`OCR extraction failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Extract text from image using OpenAI Vision or Google Cloud Vision API
   * Falls back to mock data if credentials unavailable
   */
  private async extractTextFromImage(imagePath: string): Promise<string> {
    // For development: if credentials not available, use mock
    if (!process.env.OPENAI_API_KEY) {
      this.logger.warn('Vision API not configured, using mock OCR');
      return this.getMockOcrText();
    }

    try {
      if (!this.openai) {
        return this.getMockOcrText();
      }

      // Read image file and convert to base64
      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString('base64');

      // Use OpenAI Vision for text extraction
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-vision',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
              {
                type: 'text',
                text: 'Extract ALL text from this medical document. Preserve formatting and structure. Return only the extracted text.',
              },
            ] as any,
          },
        ],
        max_tokens: 2000,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error(`Vision API extraction failed: ${error.message}`);
      return this.getMockOcrText();
    }
  }

  /**
   * Parse OCR text into structured medical fields
   */
  private async parseOcrText(
    ocrText: string,
    hasAiSubscription: boolean,
  ): Promise<OcrExtractedFields> {
    const confidenceConfig: FieldConfidenceConfig = {
      medicalFields: 0.8, // Higher threshold for critical medical data
      contactFields: 0.65, // Lower threshold for contact info
      vitalFields: 0.75, // Moderate threshold for vitals
    };

    if (!this.openai || !process.env.OPENAI_API_KEY || !hasAiSubscription) {
      // Basic extraction without AI
      return this.basicOcrParsing(ocrText, confidenceConfig);
    }

    // AI-powered detailed extraction
    const prompt = `Extract and structure medical information from this OCR text. Return ONLY valid JSON:

${ocrText}

JSON structure (all fields optional, use null if not found):
{
  "firstName": "string or null",
  "lastName": "string or null",
  "age": "number as string or null",
  "gender": "MALE|FEMALE|OTHER or null",
  "phoneNumber": "string or null",
  "email": "string or null",
  "bloodType": "string or null",
  "diagnosis": "string or null",
  "symptoms": ["string"] or null,
  "medicalHistory": ["string"] or null,
  "allergies": ["string"] or null,
  "vitals": {
    "bp": "string or null",
    "temp": "string or null",
    "pulse": "string or null",
    "respiratoryRate": "string or null",
    "spO2": "string or null",
    "glucose": "string or null"
  },
  "medications": [{"name": "string", "dosage": "string", "frequency": "string", "route": "string", "duration": "string"}] or null,
  "doctorName": "string or null",
  "visitDate": "YYYY-MM-DD or null"
}

Return ONLY the JSON object, no markdown or extra text.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelType,
        messages: [
          {
            role: 'system',
            content:
              'You are a medical document parser. Extract structured data from OCR text. Respond only with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      return this.normalizeOcrFields(parsed, confidenceConfig);
    } catch (error) {
      this.logger.error(`OCR parsing failed: ${error.message}`);
      return this.basicOcrParsing(ocrText, confidenceConfig);
    }
  }

  /**
   * Detect document type using AI
   */
  private async detectDocumentType(
    ocrText: string,
  ): Promise<'PRESCRIPTION' | 'CASE_SHEET' | 'LAB_REPORT' | 'GENERAL'> {
    if (!this.openai || !process.env.OPENAI_API_KEY) {
      return 'GENERAL';
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelType,
        messages: [
          {
            role: 'system',
            content:
              'Classify the medical document type. Return ONLY one word: PRESCRIPTION, CASE_SHEET, LAB_REPORT, or GENERAL. No other text.',
          },
          {
            role: 'user',
            content: `Classify this medical document:\n\n${ocrText.substring(0, 500)}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 10,
      });

      const type =
        response.choices[0]?.message?.content?.toUpperCase().trim() ||
        'GENERAL';
      const validTypes = [
        'PRESCRIPTION',
        'CASE_SHEET',
        'LAB_REPORT',
        'GENERAL',
      ];

      const matched = validTypes.find((t) => type.includes(t));
      return (matched as any) || 'GENERAL';
    } catch (error) {
      this.logger.error(`Document type detection failed: ${error.message}`);
      return 'GENERAL';
    }
  }

  /**
   * Generate AI-powered field suggestions based on medical validation rules
   */
  private async generateFieldSuggestions(
    fields: OcrExtractedFields,
  ): Promise<Record<string, any>> {
    if (!this.openai || !process.env.OPENAI_API_KEY) {
      return {};
    }

    const lowConfidenceFields = Object.entries(fields.fieldConfidence)
      .filter(([_, confidence]) => confidence < 0.75)
      .map(([field]) => field);

    if (lowConfidenceFields.length === 0) {
      return {};
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelType,
        messages: [
          {
            role: 'system',
            content:
              'You are a medical data validation expert. Suggest corrections for low-confidence fields. Return valid JSON with suggestions.',
          },
          {
            role: 'user',
            content: `These OCR fields have low confidence (<75%): ${lowConfidenceFields.join(', ')}\n\nCurrent extracted data:\n${JSON.stringify(fields, null, 2)}\n\nProvide suggestions as JSON: {"fieldName": "suggestedValue"}`,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content);
    } catch (error) {
      this.logger.error(`Suggestion generation failed: ${error.message}`);
      return {};
    }
  }

  /**
   * Parse medications with detailed extraction
   */
  private async parseMedications(medicationText: string): Promise<
    Array<{
      name: string;
      dosage: string;
      frequency: string;
      route: string;
      duration: string;
    }>
  > {
    if (!this.openai || !process.env.OPENAI_API_KEY) {
      return [];
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelType,
        messages: [
          {
            role: 'system',
            content:
              'Extract medication information. Return ONLY valid JSON array: [{"name":"", "dosage":"", "frequency":"", "route":"", "duration":""}]',
          },
          {
            role: 'user',
            content: `Parse these medications and return only JSON array:\n${medicationText}`,
          },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '[]';
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : parsed.medications || [];
    } catch (error) {
      this.logger.error(`Medication parsing failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(
    fieldConfidence: Record<string, number>,
  ): number {
    const scores = Object.values(fieldConfidence);
    if (scores.length === 0) return 0;
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(average * 100) / 100;
  }

  /**
   * Normalize parsed OCR fields with confidence scores
   */
  private normalizeOcrFields(
    data: any,
    config: FieldConfidenceConfig,
  ): OcrExtractedFields {
    const fieldConfidence: Record<string, number> = {};

    // Assign confidence based on field importance
    const medicalCriticalFields = ['diagnosis', 'allergies', 'medications'];
    const contactFields = ['phoneNumber', 'email'];
    const vitalFields = ['bp', 'temp', 'pulse'];

    // Initialize confidence scores
    Object.keys(data || {}).forEach((key) => {
      if (key === 'vitals' && data[key]) {
        Object.keys(data[key]).forEach((vitalKey) => {
          if (vitalFields.includes(vitalKey)) {
            fieldConfidence[`vitals_${vitalKey}`] = config.vitalFields;
          }
        });
      } else if (medicalCriticalFields.includes(key)) {
        fieldConfidence[key] = config.medicalFields;
      } else if (contactFields.includes(key)) {
        fieldConfidence[key] = config.contactFields;
      } else {
        fieldConfidence[key] = 0.7;
      }
    });

    return {
      firstName: data?.firstName || '',
      lastName: data?.lastName || '',
      age: data?.age || '',
      gender: data?.gender || 'OTHER',
      phoneNumber: data?.phoneNumber || '',
      email: data?.email || '',
      bloodType: data?.bloodType || '',
      diagnosis: data?.diagnosis || '',
      symptoms: Array.isArray(data?.symptoms) ? data.symptoms : [],
      medicalHistory: Array.isArray(data?.medicalHistory)
        ? data.medicalHistory
        : [],
      allergies: Array.isArray(data?.allergies) ? data.allergies : [],
      vitals: data?.vitals || {},
      medications: Array.isArray(data?.medications) ? data.medications : [],
      doctorName: data?.doctorName || '',
      visitDate: data?.visitDate || '',
      fieldConfidence,
    };
  }

  /**
   * Basic OCR parsing without AI (for non-subscribed users)
   */
  private basicOcrParsing(
    ocrText: string,
    config: FieldConfidenceConfig,
  ): OcrExtractedFields {
    const fieldConfidence: Record<string, number> = {};

    // Simple regex-based extraction
    const firstNameMatch = ocrText.match(/first\s*name:?\s*([^\n,]+)/i);
    const lastNameMatch = ocrText.match(/last\s*name:?\s*([^\n,]+)/i);
    const ageMatch = ocrText.match(/age:?\s*(\d+)/i);
    const phoneMatch = ocrText.match(/phone:?\s*([\d\s\-+()]+)/i);
    const bpMatch = ocrText.match(/bp:?\s*(\d+\/\d+)/i);
    const tempMatch = ocrText.match(/temp:?\s*(\d+\.?\d*)/i);
    const pulseMatch = ocrText.match(/pulse:?\s*(\d+)/i);

    const result: OcrExtractedFields = {
      firstName: firstNameMatch?.[1]?.trim() || '',
      lastName: lastNameMatch?.[1]?.trim() || '',
      age: ageMatch?.[1] || '',
      gender: 'OTHER',
      phoneNumber: phoneMatch?.[1]?.trim() || '',
      vitals: {
        bp: bpMatch?.[1] || '',
        temp: tempMatch?.[1] || '',
        pulse: pulseMatch?.[1] || '',
      },
      fieldConfidence: {
        firstName: firstNameMatch ? config.contactFields : 0.3,
        lastName: lastNameMatch ? config.contactFields : 0.3,
        age: ageMatch ? config.vitalFields : 0.3,
        phoneNumber: phoneMatch ? config.contactFields : 0.3,
        vitals_bp: bpMatch ? config.vitalFields : 0.3,
        vitals_temp: tempMatch ? config.vitalFields : 0.3,
        vitals_pulse: pulseMatch ? config.vitalFields : 0.3,
      },
    };

    return result;
  }

  /**
   * Mock OCR text for development
   */
  private getMockOcrText(): string {
    return `PATIENT INFORMATION
Name: John Doe
Age: 35
Phone: 9876543210
DOB: 12/15/1988
Blood Type: O+

VITALS
BP: 120/80 mmHg
Temperature: 98.6°F
Pulse: 72 bpm
Respiratory Rate: 16/min

CLINICAL FINDINGS
Diagnosis: Hypertension Stage 1
Symptoms: Occasional headaches, no chest pain
Allergies: Penicillin

MEDICATIONS
1. Amlodipine 5mg - Once daily
2. Metoprolol 50mg - Twice daily`;
  }
}
