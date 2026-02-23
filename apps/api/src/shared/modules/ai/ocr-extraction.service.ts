import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OpenaiService } from './openai.service';
import {
  OcrExtractedFields,
  OcrExtractionResult,
  FieldConfidenceConfig,
  OcrRawData,
} from '@workspace/types';
import * as fs from 'fs';

@Injectable()
export class OcrExtractionService {
  private readonly logger = new Logger(OcrExtractionService.name);

  constructor(private openaiService: OpenaiService) {}

  async extractFromMedicalDocument(
    imagePath: string,
    hasAiSubscription: boolean = false,
  ): Promise<OcrExtractionResult> {
    const startTime = Date.now();

    try {
      const rawText = await this.extractTextFromImage(imagePath);
      const extractedFields = await this.parseOcrText(
        rawText,
        hasAiSubscription,
      );
      const documentType = hasAiSubscription
        ? await this.detectDocumentType(rawText)
        : 'GENERAL';
      const suggestedCorrections = hasAiSubscription
        ? await this.generateFieldSuggestions(extractedFields)
        : undefined;
      const confidence = this.calculateOverallConfidence(
        extractedFields.fieldConfidence,
      );

      const duration = Date.now() - startTime;
      this.logger.log(`OCR extraction completed in ${duration}ms`);

      return {
        text: rawText,
        documentType: documentType,
        confidence,
        fields: extractedFields,
        suggestedCorrections,
      };
    } catch (error) {
      this.logger.error(
        `OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private async extractTextFromImage(imagePath: string): Promise<string> {
    if (!this.openaiService.client)
      throw new ServiceUnavailableException('OpenAI Vision API not configured');

    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');

    const response = await this.openaiService.client.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64Image}` },
            },
            {
              type: 'text',
              text: `Extract ALL text from this medical document. Demographics, Vitals, Lab values, Medications, Diagnosis, Symptoms, Dates, Doctor info, Billing details. Return ONLY the text.`,
            },
          ] as any,
        },
      ],
      max_tokens: 4000,
    });

    return response.choices[0]?.message?.content || '';
  }

  private async parseOcrText(
    ocrText: string,
    hasAiSubscription: boolean,
  ): Promise<OcrExtractedFields> {
    const config: FieldConfidenceConfig = {
      medicalFields: 0.85,
      contactFields: 0.7,
      vitalFields: 0.8,
    };

    if (!this.openaiService.client || !hasAiSubscription) {
      return this.basicOcrParsing(ocrText, config);
    }

    return this.openaiService
      .callChatCompletion({
        systemPrompt:
          'You are a medical document parser. Extract structured data into JSON.',
        userPrompt: `Extract from this OCR text:\n${ocrText}`,
      })
      .then((parsed) => this.normalizeOcrFields(parsed, config))
      .catch(() => this.basicOcrParsing(ocrText, config));
  }

  private async detectDocumentType(ocrText: string) {
    return this.openaiService.callChatCompletion({
      systemPrompt:
        'Classify document type: PRESCRIPTION, CASE_SHEET, LAB_REPORT, or GENERAL. Return one word.',
      userPrompt: ocrText.substring(0, 500),
      jsonMode: false,
    });
  }

  private async generateFieldSuggestions(fields: OcrExtractedFields) {
    const lowConfidenceFields = Object.entries(fields.fieldConfidence)
      .filter(([_, conf]) => conf < 0.75)
      .map(([f]) => f);

    if (lowConfidenceFields.length === 0) return {};

    return this.openaiService.callChatCompletion({
      systemPrompt:
        'Suggest corrections for low-confidence fields. Return JSON.',
      userPrompt: `Fields: ${lowConfidenceFields.join(', ')}\nData: ${JSON.stringify(fields)}`,
    });
  }

  private calculateOverallConfidence(
    fieldConfidence: Record<string, number>,
  ): number {
    const scores = Object.values(fieldConfidence);
    return scores.length
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) /
          100
      : 0;
  }

  private normalizeOcrFields(
    data: OcrRawData | null | undefined,
    config: FieldConfidenceConfig,
  ): OcrExtractedFields {
    const fieldConfidence: Record<string, number> = {};

    const assignConfidence = (key: string, hasValue: boolean): number => {
      if (!hasValue) return 0.3;
      const medicalCriticalFields = [
        'diagnosis',
        'allergies',
        'medications',
        'vitals',
      ];
      const contactFields = ['phoneNumber', 'email', 'firstName', 'lastName'];
      const vitalFields = ['bp', 'temp', 'pulse', 'respiratoryRate', 'spO2'];
      const invoiceFields = ['invoiceNumber', 'totalAmount', 'components'];

      if (medicalCriticalFields.includes(key)) return config.medicalFields;
      if (contactFields.includes(key)) return config.contactFields;
      if (vitalFields.includes(key)) return config.vitalFields;
      if (invoiceFields.includes(key)) return 0.8;
      return 0.75;
    };

    const toStr = (val: string | number | undefined): string =>
      val !== undefined && val !== null ? String(val) : '';

    const result: OcrExtractedFields = {
      firstName: data?.firstName || '',
      lastName: data?.lastName || '',
      age: toStr(data?.age),
      dateOfBirth: data?.dateOfBirth || '',
      gender: ['MALE', 'FEMALE', 'OTHER'].includes(data?.gender || '')
        ? (data?.gender as 'MALE' | 'FEMALE' | 'OTHER')
        : 'OTHER',
      phoneNumber: data?.phoneNumber || '',
      email: data?.email || '',
      bloodType: data?.bloodType || '',
      patientId: data?.patientId || '',
      diagnosis: data?.diagnosis || '',
      symptoms: Array.isArray(data?.symptoms)
        ? data.symptoms.filter((s) => s)
        : [],
      medicalHistory: Array.isArray(data?.medicalHistory)
        ? data.medicalHistory.filter((m) => m)
        : [],
      complaints: data?.complaints ? [data.complaints] : [],
      allergies: Array.isArray(data?.allergies)
        ? data.allergies.filter((a) => a)
        : [],
      physicalExamination: data?.physicalExamination || '',
      vitals: {
        bp: data?.vitals?.bp || '',
        temp: toStr(data?.vitals?.temp),
        pulse: toStr(data?.vitals?.pulse),
        respiratoryRate: toStr(data?.vitals?.respiratoryRate),
        spO2: toStr(data?.vitals?.spO2),
        weight: toStr(data?.vitals?.weight),
        height: toStr(data?.vitals?.height),
        bmi: toStr(data?.vitals?.bmi),
      },
      labValues: {
        hemoglobin: data?.labValues?.hemoglobin || '',
        creatinine: data?.labValues?.creatinine || '',
        glucose: data?.labValues?.glucose || '',
        ...data?.labValues,
      },
      medications: Array.isArray(data?.medications)
        ? data.medications
            .filter((m) => m?.name)
            .map((m) => ({
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
        ? data.followUpRecommendations.filter((r) => r)
        : [],
      invoice: data?.invoice
        ? {
            invoiceNumber: data.invoice.invoiceNumber || '',
            invoiceDate: data.invoice.invoiceDate || '',
            totalAmount: toStr(data.invoice.totalAmount),
            components: Array.isArray(data.invoice.components)
              ? data.invoice.components
                  .filter((c) => c?.description)
                  .map((c) => ({
                    description: c.description || '',
                    amount: toStr(c.amount),
                    quantity: toStr(c.quantity),
                  }))
              : [],
            consultationFee: toStr(data.invoice.consultationFee),
            testsFee: toStr(data.invoice.testsFee),
            procedureFee: toStr(data.invoice.procedureFee),
            medicationFee: toStr(data.invoice.medicationFee),
            discount: toStr(data.invoice.discount),
            discountPercentage: toStr(data.invoice.discountPercentage),
            taxAmount: toStr(data.invoice.taxAmount),
            paymentMethod: data.invoice.paymentMethod || '',
            paymentStatus: data.invoice.paymentStatus || '',
          }
        : undefined,
      fieldConfidence: {},
    };

    Object.entries(result).forEach(([key, value]) => {
      if (key === 'fieldConfidence') return;
      const hasValue =
        value &&
        (typeof value === 'string'
          ? value.trim() !== ''
          : Array.isArray(value)
            ? value.length > 0
            : Object.values(value).some((v) => v));
      fieldConfidence[key] = assignConfidence(key, hasValue);
    });

    result.fieldConfidence = fieldConfidence;
    return result;
  }

  private basicOcrParsing(
    ocrText: string,
    config: FieldConfidenceConfig,
  ): OcrExtractedFields {
    const patterns = {
      firstName: /first\s*name[:\s]+([^\n,]+)/i,
      lastName: /last\s*name[:\s]+([^\n,]+)/i,
      age: /age[:\s]+(\d+)/i,
      phoneNumber: /phone[:\s]+([\d\s\-+()]+)/i,
      email: /email[:\s]+([^\s@]+@[^\s@]+)/i,
      bloodType: /blood\s*(?:type|group)[:\s]+([OAB+-]+)/i,
      bp: /(?:bp|blood\s*pressure)[:\s]+(\d+\/\d+)/i,
      temp: /(?:temp|temperature)[:\s]+(\d+\.?\d*)\s*[°c]/i,
      pulse: /(?:pulse|heart\s*rate)[:\s]+(\d+)/i,
      diagnosis: /(?:diagnosis|impression)[:\s]*([^\n]+)/i,
      doctorName: /(?:doctor|dr|physician)[:\s]+([^\n,]+)/i,
      clinicName: /(?:clinic|hospital|centre)[:\s]+([^\n,]+)/i,
      visitDate:
        /(?:date|visit\s*date|appointment)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
      invoiceNumber: /(?:invoice|bill)[:\s]*(?:no|number)[:\s]+([^\n,]+)/i,
      totalAmount: /(?:total|amount)[:\s]+(?:₹|$|rs)?(\d+\.?\d*)/i,
    };

    const extract = (pattern: RegExp): string => {
      const match = ocrText.match(pattern);
      return match ? match[1]?.trim() || '' : '';
    };

    const res = {
      firstName: extract(patterns.firstName),
      lastName: extract(patterns.lastName),
      age: extract(patterns.age),
      phoneNumber: extract(patterns.phoneNumber),
      email: extract(patterns.email),
      bloodType: extract(patterns.bloodType),
      diagnosis: extract(patterns.diagnosis),
      vitals: {
        bp: extract(patterns.bp),
        temp: extract(patterns.temp),
        pulse: extract(patterns.pulse),
      },
      doctorName: extract(patterns.doctorName),
      clinicName: extract(patterns.clinicName),
      visitDate: extract(patterns.visitDate),
      invoice: {
        invoiceNumber: extract(patterns.invoiceNumber),
        totalAmount: extract(patterns.totalAmount),
      },
    };

    return this.normalizeOcrFields(res as any, config);
  }
}
