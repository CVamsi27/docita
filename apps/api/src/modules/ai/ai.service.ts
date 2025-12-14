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
  patientId?: string;

  // Clinical Data
  diagnosis?: string;
  symptoms?: string[];
  medicalHistory?: string[];
  allergies?: string[];
  complaints?: string[];
  physicalExamination?: string;

  // Vitals
  vitals?: {
    bp?: string;
    temp?: string;
    pulse?: string;
    respiratoryRate?: string;
    spO2?: string;
    glucose?: string;
    weight?: string;
    height?: string;
    bmi?: string;
  };

  // Lab Values
  labValues?: {
    hemoglobin?: string;
    creatinine?: string;
    glucose?: string;
    [key: string]: string | undefined;
  };

  // Medications (detailed extraction)
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    route?: string;
    duration?: string;
    indication?: string;
    strength?: string;
    quantity?: string;
  }>;

  // Prescription Information
  prescriptionDate?: string;
  prescriptionId?: string;
  expiryDate?: string;
  documentDate?: string;
  referralDate?: string;

  // Invoice/Billing Information
  invoice?: {
    invoiceNumber?: string;
    invoiceDate?: string;
    totalAmount?: string;
    components?: Array<{
      description: string;
      amount: string;
      quantity?: string;
    }>;
    consultationFee?: string;
    testsFee?: string;
    procedureFee?: string;
    medicationFee?: string;
    discount?: string;
    discountPercentage?: string;
    taxAmount?: string;
    paymentMethod?: string;
    paymentStatus?: string;
  };

  // Document Metadata
  doctorName?: string;
  doctorLicense?: string;
  doctorSpecialization?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  visitDate?: string;
  visitTime?: string;
  nextVisitDate?: string;
  referralTo?: string;

  // Document Analysis
  documentType?: 'PRESCRIPTION' | 'CASE_SHEET' | 'LAB_REPORT' | 'INVOICE' | 'GENERAL';
  notes?: string;
  followUpRecommendations?: string[];

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
        'OpenAI API key not configured. AI features will not be available.',
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

      if (!this.openai || !process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API is not configured. Cannot analyze prescription.');
      }

      const result = await this.callOpenAIPrescriptionAnalysis(request);

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

      throw error;
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

      if (!this.openai || !process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API is not configured. Cannot suggest diagnoses.');
      }

      const result = await this.callOpenAIDiagnosisSuggestions(
        symptoms,
        findingsNotes,
      );

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

      throw error;
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

      if (!this.openai || !process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API is not configured. Cannot recommend medications.');
      }

      const result = await this.callOpenAIMedicationRecommendations(
        condition,
        patientAge,
        allergies,
      );

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

      throw error;
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
   * Normalize diagnosis suggestions response from OpenAI
   */
  /**
   * Normalize medication recommendations response from OpenAI
   */
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
   * Extract text from image using OpenAI Vision API
   * Requires OpenAI API credentials to be configured
   */
  private async extractTextFromImage(imagePath: string): Promise<string> {
    if (!process.env.OPENAI_API_KEY || !this.openai) {
      throw new Error('OpenAI Vision API is not configured. Cannot extract text from image.');
    }

    try {
      // Read image file and convert to base64
      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString('base64');

      // Use OpenAI Vision for text extraction with enhanced prompt
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
                text: `Extract ALL text from this medical/healthcare document. Include:
- Patient demographics (name, age, ID, contact info)
- Vital signs (BP, temperature, pulse, respiratory rate, SpO2, weight, height)
- Lab values and test results
- Medications (name, dosage, frequency, route, duration)
- Diagnosis, symptoms, complaints, medical history
- Document dates, visit dates, doctor information
- Invoice/billing details (amounts, itemized charges, payment info)
- Any other clinical notes, recommendations, or relevant information

Preserve all formatting, structure, numbers, dates, and special characters.
Return ONLY the extracted text, no additional commentary.`,
              },
            ] as any,
          },
        ],
        max_tokens: 4000,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error(`Vision API extraction failed: ${error.message}`);
      throw error;
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
      medicalFields: 0.85,
      contactFields: 0.70,
      vitalFields: 0.80,
    };

    if (!this.openai || !process.env.OPENAI_API_KEY || !hasAiSubscription) {
      return this.basicOcrParsing(ocrText, confidenceConfig);
    }

    // AI-powered detailed extraction with comprehensive field detection
    const prompt = `Extract and structure ALL medical information from this OCR text. Be thorough and extract every field you can identify.

OCR TEXT:
${ocrText}

Return ONLY valid JSON (no markdown, no code blocks, just the JSON object):
{
  "firstName": "string or null",
  "lastName": "string or null",
  "patientId": "string or null",
  "age": "number as string or null",
  "dateOfBirth": "YYYY-MM-DD or null",
  "gender": "MALE|FEMALE|OTHER or null",
  "phoneNumber": "string or null",
  "email": "string or null",
  "bloodType": "string or null",
  "diagnosis": "string or null",
  "symptoms": ["string"] or null",
  "complaints": "string or null",
  "medicalHistory": ["string"] or null",
  "allergies": ["string"] or null",
  "physicalExamination": "string or null",
  "vitals": {
    "bp": "XXX/YYY or null",
    "temp": "number or null",
    "pulse": "number or null",
    "respiratoryRate": "number or null",
    "spO2": "percentage or null",
    "weight": "number or null",
    "height": "number or null",
    "bmi": "number or null"
  },
  "labValues": {
    "hemoglobin": "string or null",
    "creatinine": "string or null",
    "glucose": "string or null"
  },
  "medications": [
    {
      "name": "string",
      "dosage": "string (e.g., 500mg, 2 tablets)",
      "frequency": "string (e.g., twice daily, 8-hourly)",
      "route": "string (e.g., oral, IV, IM, topical) or null",
      "duration": "string (e.g., 7 days, 2 weeks) or null",
      "strength": "string or null",
      "quantity": "string (number of tablets/units) or null",
      "indication": "string (reason for medication) or null"
    }
  ] or null",
  "prescriptionDate": "YYYY-MM-DD or null",
  "prescriptionId": "string or null",
  "documentDate": "YYYY-MM-DD or null",
  "visitDate": "YYYY-MM-DD or null",
  "visitTime": "HH:MM or null",
  "expiryDate": "YYYY-MM-DD or null",
  "nextVisitDate": "YYYY-MM-DD or null",
  "doctorName": "string or null",
  "doctorLicense": "string or null",
  "doctorSpecialization": "string or null",
  "clinicName": "string or null",
  "clinicAddress": "string or null",
  "clinicPhone": "string or null",
  "referralTo": "string or null",
  "referralDate": "YYYY-MM-DD or null",
  "notes": "string or null",
  "followUpRecommendations": ["string"] or null",
  "invoice": {
    "invoiceNumber": "string or null",
    "invoiceDate": "YYYY-MM-DD or null",
    "components": [
      {
        "description": "string (e.g., Consultation, Lab Test - Hemoglobin, Medication)",
        "amount": "number or string or null",
        "quantity": "number or null"
      }
    ] or null",
    "consultationFee": "number or string or null",
    "testsFee": "number or string or null",
    "procedureFee": "number or string or null",
    "medicationFee": "number or string or null",
    "discount": "number or string or null",
    "discountPercentage": "number or string or null",
    "taxAmount": "number or string or null",
    "totalAmount": "number or string or null",
    "paymentMethod": "string (e.g., Cash, Card, Bank Transfer) or null",
    "paymentStatus": "string (e.g., Paid, Pending) or null"
  } or null"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelType,
        messages: [
          {
            role: 'system',
            content: `You are a medical document parser expert. Extract ALL structured data from OCR text with high accuracy. 
Be thorough - extract every field you can identify, even if not all fields are present. 
Use null for fields that are not found in the text.
Return ONLY valid JSON, no markdown formatting, no code blocks, no extra text.
For medication, extract EVERY medication mentioned with all available details.
For invoice, extract EVERY line item if available.
Dates should be in YYYY-MM-DD format if possible, otherwise preserve as written.
Numeric values should be cleaned (remove currency symbols, % signs) and preserved as numbers or strings.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      const normalized = this.normalizeOcrFields(parsed, confidenceConfig);
      
      this.logger.debug(`Extracted fields: ${JSON.stringify(Object.keys(normalized))}`);
      return normalized;
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

    // Helper function to assign confidence based on field type and presence
    const assignConfidence = (key: string, hasValue: boolean): number => {
      if (!hasValue) return 0.3;

      const medicalCriticalFields = ['diagnosis', 'allergies', 'medications', 'vitals'];
      const contactFields = ['phoneNumber', 'email', 'firstName', 'lastName'];
      const vitalFields = ['bp', 'temp', 'pulse', 'respiratoryRate', 'spO2'];
      const invoiceFields = ['invoiceNumber', 'totalAmount', 'components'];

      if (medicalCriticalFields.includes(key)) return config.medicalFields;
      if (contactFields.includes(key)) return config.contactFields;
      if (vitalFields.includes(key)) return config.vitalFields;
      if (invoiceFields.includes(key)) return 0.8;
      
      return 0.75;
    };

    // Process each field with confidence scoring
    const result: OcrExtractedFields = {
      firstName: data?.firstName || '',
      lastName: data?.lastName || '',
      age: data?.age || '',
      dateOfBirth: data?.dateOfBirth || '',
      gender: data?.gender || 'OTHER',
      phoneNumber: data?.phoneNumber || '',
      email: data?.email || '',
      bloodType: data?.bloodType || '',
      patientId: data?.patientId || '',
      
      diagnosis: data?.diagnosis || '',
      symptoms: Array.isArray(data?.symptoms) ? data.symptoms.filter((s: any) => s) : [],
      complaints: data?.complaints || '',
      medicalHistory: Array.isArray(data?.medicalHistory) ? data.medicalHistory.filter((m: any) => m) : [],
      allergies: Array.isArray(data?.allergies) ? data.allergies.filter((a: any) => a) : [],
      physicalExamination: data?.physicalExamination || '',
      
      vitals: {
        bp: data?.vitals?.bp || '',
        temp: data?.vitals?.temp || '',
        pulse: data?.vitals?.pulse || '',
        respiratoryRate: data?.vitals?.respiratoryRate || '',
        spO2: data?.vitals?.spO2 || '',
        weight: data?.vitals?.weight || '',
        height: data?.vitals?.height || '',
        bmi: data?.vitals?.bmi || '',
      },
      
      labValues: {
        hemoglobin: data?.labValues?.hemoglobin || '',
        creatinine: data?.labValues?.creatinine || '',
        glucose: data?.labValues?.glucose || '',
        ...data?.labValues,
      },
      
      medications: Array.isArray(data?.medications)
        ? data.medications.filter((m: any) => m?.name).map((m: any) => ({
            name: m.name || '',
            dosage: m.dosage || '',
            frequency: m.frequency || '',
            route: m.route || '',
            duration: m.duration || '',
            indication: m.indication || '',
            strength: m.strength || '',
            quantity: m.quantity || '',
          }))
        : [],
      
      prescriptionDate: data?.prescriptionDate || '',
      prescriptionId: data?.prescriptionId || '',
      documentDate: data?.documentDate || '',
      visitDate: data?.visitDate || '',
      visitTime: data?.visitTime || '',
      expiryDate: data?.expiryDate || '',
      nextVisitDate: data?.nextVisitDate || '',
      referralDate: data?.referralDate || '',
      
      doctorName: data?.doctorName || '',
      doctorLicense: data?.doctorLicense || '',
      doctorSpecialization: data?.doctorSpecialization || '',
      clinicName: data?.clinicName || '',
      clinicAddress: data?.clinicAddress || '',
      clinicPhone: data?.clinicPhone || '',
      referralTo: data?.referralTo || '',
      
      notes: data?.notes || '',
      followUpRecommendations: Array.isArray(data?.followUpRecommendations)
        ? data.followUpRecommendations.filter((r: any) => r)
        : [],
      
      invoice: data?.invoice ? {
        invoiceNumber: data.invoice.invoiceNumber || '',
        invoiceDate: data.invoice.invoiceDate || '',
        totalAmount: data.invoice.totalAmount || '',
        components: Array.isArray(data.invoice.components)
          ? data.invoice.components.filter((c: any) => c?.description).map((c: any) => ({
              description: c.description || '',
              amount: c.amount || '',
              quantity: c.quantity || '',
            }))
          : [],
        consultationFee: data.invoice.consultationFee || '',
        testsFee: data.invoice.testsFee || '',
        procedureFee: data.invoice.procedureFee || '',
        medicationFee: data.invoice.medicationFee || '',
        discount: data.invoice.discount || '',
        discountPercentage: data.invoice.discountPercentage || '',
        taxAmount: data.invoice.taxAmount || '',
        paymentMethod: data.invoice.paymentMethod || '',
        paymentStatus: data.invoice.paymentStatus || '',
      } : undefined,
      
      fieldConfidence: {},
    };

    // Assign confidence scores
    Object.entries(result).forEach(([key, value]) => {
      if (key === 'fieldConfidence') return;
      
      const hasValue = value && (
        typeof value === 'string' ? value.trim() !== '' :
        Array.isArray(value) ? value.length > 0 :
        typeof value === 'object' ? Object.values(value as any).some(v => v) :
        false
      );
      
      fieldConfidence[key] = assignConfidence(key, hasValue);
    });

    result.fieldConfidence = fieldConfidence;
    return result;
  }

  /**
   * Basic OCR parsing without AI (for non-subscribed users)
   */
  private basicOcrParsing(
    ocrText: string,
    config: FieldConfidenceConfig,
  ): OcrExtractedFields {
    const fieldConfidence: Record<string, number> = {};

    // Simple regex-based extraction for various fields
    const patterns = {
      firstName: /first\s*name[:\s]+([^\n,]+)/i,
      lastName: /last\s*name[:\s]+([^\n,]+)/i,
      age: /age[:\s]+(\d+)/i,
      phoneNumber: /phone[:\s]+([\d\s\-+()]+)/i,
      email: /email[:\s]+([^\s@]+@[^\s@]+)/i,
      bloodType: /blood\s*(?:type|group)[:\s]+([OAB+-]+)/i,
      
      // Vitals patterns
      bp: /(?:bp|blood\s*pressure)[:\s]+(\d+\/\d+)/i,
      temp: /(?:temp|temperature)[:\s]+(\d+\.?\d*)\s*[°c]/i,
      pulse: /(?:pulse|heart\s*rate)[:\s]+(\d+)/i,
      respiratoryRate: /(?:rr|respiratory\s*rate)[:\s]+(\d+)/i,
      spO2: /(?:spo2|oxygen\s*sat)[:\s]+(\d+)\s*%/i,
      weight: /weight[:\s]+(\d+\.?\d*)\s*(?:kg|kg|lbs)/i,
      height: /height[:\s]+(\d+\.?\d*)\s*(?:cm|m|inches)/i,
      
      // Medication patterns
      medications: /(?:medication|drug|treatment)[:\s]*([^\n]+(?:\n[^\n]+)*)/i,
      
      // Document info
      diagnosis: /(?:diagnosis|impression)[:\s]*([^\n]+)/i,
      doctorName: /(?:doctor|dr|physician)[:\s]+([^\n,]+)/i,
      clinicName: /(?:clinic|hospital|centre)[:\s]+([^\n,]+)/i,
      visitDate: /(?:date|visit\s*date|appointment)[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      documentDate: /(?:date|issued?)[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      
      // Invoice patterns
      invoiceNumber: /(?:invoice|bill)[:\s]*(?:no|number)[:\s]+([^\n,]+)/i,
      totalAmount: /(?:total|amount)[:\s]+(?:₹|$|rs)?(\d+\.?\d*)/i,
      consultationFee: /consultation[:\s]+(?:₹|$|rs)?(\d+\.?\d*)/i,
    };

    const extract = (pattern: RegExp): string => {
      const match = ocrText.match(pattern);
      return match ? match[1]?.trim() || '' : '';
    };

    // Extract basic fields
    const firstName = extract(patterns.firstName);
    const lastName = extract(patterns.lastName);
    const age = extract(patterns.age);
    const phoneNumber = extract(patterns.phoneNumber);
    const email = extract(patterns.email);
    const bloodType = extract(patterns.bloodType);
    
    const bp = extract(patterns.bp);
    const temp = extract(patterns.temp);
    const pulse = extract(patterns.pulse);
    const respiratoryRate = extract(patterns.respiratoryRate);
    const spO2 = extract(patterns.spO2);
    const weight = extract(patterns.weight);
    const height = extract(patterns.height);
    
    const diagnosis = extract(patterns.diagnosis);
    const doctorName = extract(patterns.doctorName);
    const clinicName = extract(patterns.clinicName);
    const visitDate = extract(patterns.visitDate);
    const documentDate = extract(patterns.documentDate);
    
    const invoiceNumber = extract(patterns.invoiceNumber);
    const totalAmount = extract(patterns.totalAmount);
    const consultationFee = extract(patterns.consultationFee);

    // Extract medications (split by newlines and common delimiters)
    const medicationsMatch = ocrText.match(/(?:medication|drug|treatment)[\s:]*([^\n]+(?:\n[^\n]+)*)/i);
    const medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      route?: string;
      duration?: string;
    }> = [];
    
    if (medicationsMatch) {
      const medText = medicationsMatch[1];
      const medLines = medText.split('\n').filter(line => line.trim());
      
      medLines.forEach(line => {
        const medMatch = line.match(/^([^-\d]+?)(?:[-:\s]+(\d+\s*(?:mg|ml|tabs?|units?)))?(?:[-:\s]+([^-\n]+))?/);
        if (medMatch) {
          medications.push({
            name: medMatch[1]?.trim() || '',
            dosage: medMatch[2]?.trim() || '',
            frequency: medMatch[3]?.trim() || '',
          });
        }
      });
    }

    // Build result with enhanced fields
    const result: OcrExtractedFields = {
      firstName,
      lastName,
      age,
      gender: 'OTHER',
      phoneNumber,
      email,
      bloodType,
      diagnosis,
      vitals: {
        bp,
        temp,
        pulse,
        respiratoryRate,
        spO2,
        weight,
        height,
      },
      medications: medications.length > 0 ? medications : [],
      doctorName,
      clinicName,
      visitDate,
      documentDate,
      invoice: (invoiceNumber || totalAmount) ? {
        invoiceNumber,
        totalAmount,
        consultationFee,
      } : undefined,
      fieldConfidence: {
        firstName: firstName ? config.contactFields : 0.3,
        lastName: lastName ? config.contactFields : 0.3,
        age: age ? config.vitalFields : 0.3,
        phoneNumber: phoneNumber ? config.contactFields : 0.3,
        email: email ? config.contactFields : 0.3,
        diagnosis: diagnosis ? config.medicalFields : 0.3,
        vitals_bp: bp ? config.vitalFields : 0.3,
        vitals_temp: temp ? config.vitalFields : 0.3,
        vitals_pulse: pulse ? config.vitalFields : 0.3,
        medications: medications.length > 0 ? config.medicalFields : 0.3,
        doctorName: doctorName ? 0.7 : 0.3,
        visitDate: visitDate ? 0.75 : 0.3,
        invoice: (invoiceNumber || totalAmount) ? 0.75 : 0.3,
      },
    };

    return result;
  }

}
