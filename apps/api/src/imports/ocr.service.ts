import { Injectable, Logger } from '@nestjs/common';
import * as Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import * as path from 'path';

interface ExtractedText {
  text: string;
  confidence: number;
  documentType: 'PRESCRIPTION' | 'CASE_SHEET' | 'LAB_REPORT' | 'GENERAL';
}

@Injectable()
export class OCRService {
  private readonly logger = new Logger(OCRService.name);

  /**
   * Preprocess image for better OCR accuracy
   * - Convert to grayscale
   * - Enhance contrast
   * - Resize if too small
   * - Denoise
   */
  async preprocessImage(imagePath: string): Promise<Buffer> {
    try {
      let pipeline = sharp(imagePath);

      // Get image metadata to check dimensions
      const metadata = await pipeline.metadata();
      this.logger.debug(`Original image: ${metadata.width}x${metadata.height}`);

      // If image is too small, upscale it
      if (metadata.width && metadata.width < 800) {
        const targetWidth = Math.round(
          (metadata.width * 1200) / (metadata.width || 1),
        );
        pipeline = pipeline.resize(targetWidth, null, {
          withoutEnlargement: false,
        });
      }

      // Convert to grayscale for better text detection
      pipeline = pipeline.grayscale();

      // Enhance contrast
      pipeline = pipeline.normalize();

      // Return buffer directly instead of saving to file
      this.logger.debug(`Preprocessing complete for ${imagePath}`);
      return await pipeline.png().toBuffer();
    } catch (error) {
      this.logger.error(`Image preprocessing failed: ${error.message}`);
      // Return original image buffer if preprocessing fails
      return await fs.readFile(imagePath);
    }
  }

  /**
   * Extract text from medical document using Tesseract.js
   * Falls back to placeholder extraction if Tesseract unavailable
   */
  async extractTextFromImage(imagePath: string): Promise<ExtractedText> {
    let worker: any = null;

    try {
      // First, verify the file exists and is readable
      try {
        await fs.readFile(imagePath);
        this.logger.log(`[OCR] File verified: ${imagePath}`);
      } catch (fileError) {
        this.logger.error(`[OCR] File not found or unreadable: ${imagePath}`);
        return {
          text: '',
          confidence: 0.1,
          documentType: 'GENERAL',
        };
      }

      // Preprocess image for better accuracy
      const processedBuffer = await this.preprocessImage(imagePath);
      this.logger.log(
        `[OCR] Image preprocessed, buffer size: ${processedBuffer.length} bytes`,
      );

      this.logger.log(`[OCR] Starting Tesseract OCR for ${imagePath}`);

      // Create worker for OCR with timeout
      try {
        worker = await Promise.race([
          Tesseract.createWorker('eng'),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Tesseract worker creation timeout')),
              30000,
            ),
          ),
        ]);
        this.logger.log('[OCR] Tesseract worker created successfully');
      } catch (workerError) {
        this.logger.warn(
          `[OCR] Tesseract worker creation failed: ${workerError.message}. Returning empty results.`,
        );
        return {
          text: '',
          confidence: 0.15,
          documentType: 'GENERAL',
        };
      }

      // Run OCR on processed image with timeout
      let result;
      try {
        result = await Promise.race([
          worker.recognize(processedBuffer),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Tesseract recognition timeout')),
              60000,
            ),
          ),
        ]);
        this.logger.log('[OCR] Tesseract recognition completed');
      } catch (recognizeError) {
        this.logger.warn(
          `[OCR] Tesseract recognition failed: ${recognizeError.message}`,
        );
        return {
          text: '',
          confidence: 0.15,
          documentType: 'GENERAL',
        };
      }

      const extractedText = result.data.text || '';
      const confidence = Math.min((result.data.confidence || 0) / 100, 0.95); // Convert to 0-1 scale, cap at 0.95

      this.logger.log(
        `[OCR] Extraction completed - confidence: ${confidence.toFixed(2)}, text length: ${extractedText.length}`,
      );

      // Determine document type based on extracted text
      const documentType = this.detectDocumentType(extractedText);

      return {
        text: extractedText,
        confidence: Math.max(confidence, 0.1), // Ensure minimum 0.1 confidence
        documentType,
      };
    } catch (error) {
      this.logger.error(
        `[OCR] Unexpected error: ${error.message}`,
        error.stack,
      );
      // Return empty text with low confidence instead of throwing
      return {
        text: '',
        confidence: 0.1,
        documentType: 'GENERAL',
      };
    } finally {
      // Ensure worker is cleaned up
      if (worker) {
        try {
          await worker.terminate();
          this.logger.debug('[OCR] Worker terminated');
        } catch (e) {
          this.logger.warn(`[OCR] Failed to terminate worker: ${e}`);
        }
      }
    }
  }

  /**
   * Detect document type from extracted text
   */
  private detectDocumentType(
    text: string,
  ): 'PRESCRIPTION' | 'CASE_SHEET' | 'LAB_REPORT' | 'GENERAL' {
    const lowerText = text.toLowerCase();

    // Prescription indicators
    if (
      lowerText.includes('rx') ||
      lowerText.includes('prescription') ||
      lowerText.includes('medication') ||
      lowerText.includes('dosage') ||
      lowerText.includes('take')
    ) {
      return 'PRESCRIPTION';
    }

    // Lab report indicators
    if (
      lowerText.includes('lab') ||
      lowerText.includes('result') ||
      lowerText.includes('test') ||
      lowerText.includes('hemoglobin') ||
      lowerText.includes('glucose') ||
      lowerText.includes('creatinine') ||
      lowerText.includes('value')
    ) {
      return 'LAB_REPORT';
    }

    // Case sheet indicators
    if (
      lowerText.includes('case sheet') ||
      lowerText.includes('diagnosis') ||
      lowerText.includes('chief complaint') ||
      lowerText.includes('history') ||
      lowerText.includes('examination')
    ) {
      return 'CASE_SHEET';
    }

    return 'GENERAL';
  }

  /**
   * Parse extracted text into structured medical fields
   */
  parseExtractedText(text: string): Record<string, any> {
    const fields: Record<string, any> = {
      firstName: '',
      lastName: '',
      age: '',
      gender: 'MALE',
      phoneNumber: '',
      email: '',
      bloodType: '',
      diagnosis: '',
      symptoms: [],
      allergies: [],
      medicalHistory: [],
      medications: [],
      vitals: {
        bp: '',
        temp: '',
        pulse: '',
        respiratoryRate: '',
        spO2: '',
        glucose: '',
      },
      labValues: {
        glucose: '',
        hemoglobin: '',
        creatinine: '',
      },
    };

    const lines = text.split('\n');

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      // Extract phone numbers (10 digits)
      const phoneMatch = line.match(/\b(\d{10})\b/);
      if (phoneMatch && !fields.phoneNumber) {
        fields.phoneNumber = phoneMatch[1];
      }

      // Extract email
      const emailMatch = line.match(
        /([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
      );
      if (emailMatch && !fields.email) {
        fields.email = emailMatch[1];
      }

      // Extract age
      const ageMatch = line.match(/age[:\s]+(\d{1,3})/i);
      if (ageMatch && !fields.age) {
        fields.age = ageMatch[1];
      }

      // Extract blood type
      const bloodMatch = line.match(/(O|A|B|AB)[\s-]*([+-])/i);
      if (bloodMatch && !fields.bloodType) {
        fields.bloodType = `${bloodMatch[1]}${bloodMatch[2]}`;
      }

      // Extract vital signs - BP
      const bpMatch = line.match(/(\d{2,3})\/(\d{2,3})\s*(?:mmhg)?/i);
      if (bpMatch && !fields.vitals.bp) {
        fields.vitals.bp = `${bpMatch[1]}/${bpMatch[2]}`;
      }

      // Extract temperature
      const tempMatch = line.match(/temp[:\s]*(\d+\.?\d*)\s*(?:°|c|f)?/i);
      if (tempMatch && !fields.vitals.temp) {
        fields.vitals.temp = tempMatch[1];
      }

      // Extract pulse/HR
      const pulseMatch = line.match(/(?:pulse|hr|heart rate)[:\s]*(\d+)/i);
      if (pulseMatch && !fields.vitals.pulse) {
        fields.vitals.pulse = pulseMatch[1];
      }

      // Extract medications (format: "medication name - dosage")
      const medMatch = line.match(
        /([a-zA-Z\s]+?)\s*[-:]?\s*(\d+\s*(?:mg|ml|tabs?|units?|caps?|gm))/i,
      );
      if (
        medMatch &&
        lowerLine.includes('medication') === false &&
        fields.medications.length < 10
      ) {
        const med = {
          name: medMatch[1].trim(),
          dosage: medMatch[2].trim(),
          frequency: '',
          route: '',
          duration: '',
        };

        // Try to extract frequency
        const freqMatch = line.match(
          /(?:once|twice|thrice|1x|2x|3x|bd|tid|qd)\s+(?:daily|daily)?/i,
        );
        if (freqMatch) {
          med.frequency = freqMatch[0];
        }

        fields.medications.push(med);
      }

      // Extract lab values
      if (lowerLine.includes('hemoglobin') || lowerLine.includes('hb')) {
        const valueMatch = line.match(/(\d+\.?\d*)/);
        if (valueMatch) {
          fields.labValues.hemoglobin = valueMatch[1];
        }
      }

      if (lowerLine.includes('glucose') || lowerLine.includes('blood sugar')) {
        const valueMatch = line.match(/(\d+\.?\d*)/);
        if (valueMatch) {
          fields.labValues.glucose = valueMatch[1];
        }
      }

      if (lowerLine.includes('creatinine')) {
        const valueMatch = line.match(/(\d+\.?\d*)/);
        if (valueMatch) {
          fields.labValues.creatinine = valueMatch[1];
        }
      }

      // Extract diagnosis
      if (
        (lowerLine.includes('diagnosis') || lowerLine.includes('diagnosed')) &&
        !fields.diagnosis
      ) {
        const diagMatch = line.match(/diagnosis[:\s]+([^,]+)/i);
        if (diagMatch) {
          fields.diagnosis = diagMatch[1].trim();
        }
      }

      // Extract names (heuristic: capitalized words at start of lines)
      if (line.match(/^[A-Z][a-z]+\s[A-Z][a-z]+/) && !fields.firstName) {
        const names = line.match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+)/);
        if (names) {
          fields.firstName = names[1];
          fields.lastName = names[2];
        }
      }
    }

    return fields;
  }

  /**
   * Generate confidence scores for extracted fields
   */
  generateConfidenceScores(
    extractedText: string,
    fields: Record<string, any>,
  ): Record<string, number> {
    const scores: Record<string, number> = {};
    const lowerText = extractedText.toLowerCase();

    // Default scores based on field presence and text quality
    scores.firstName = fields.firstName ? 0.7 : 0.2;
    scores.lastName = fields.lastName ? 0.7 : 0.2;
    scores.age = fields.age ? 0.8 : 0.2;
    scores.phoneNumber = fields.phoneNumber ? 0.85 : 0.2;
    scores.email = fields.email ? 0.9 : 0.2;
    scores.bloodType = fields.bloodType ? 0.75 : 0.2;
    scores.diagnosis = fields.diagnosis ? 0.65 : 0.2;

    // Vitals confidence
    scores['vitals.bp'] = fields.vitals?.bp ? 0.8 : 0.2;
    scores['vitals.temp'] = fields.vitals?.temp ? 0.75 : 0.2;
    scores['vitals.pulse'] = fields.vitals?.pulse ? 0.8 : 0.2;

    // Lab values confidence
    scores['labValues.glucose'] = fields.labValues?.glucose ? 0.8 : 0.2;
    scores['labValues.hemoglobin'] = fields.labValues?.hemoglobin ? 0.8 : 0.2;
    scores['labValues.creatinine'] = fields.labValues?.creatinine ? 0.8 : 0.2;

    // Array fields
    scores.medications = fields.medications?.length > 0 ? 0.7 : 0.2;
    scores.symptoms = fields.symptoms?.length > 0 ? 0.5 : 0.2;
    scores.allergies = fields.allergies?.length > 0 ? 0.5 : 0.2;

    return scores;
  }
}
