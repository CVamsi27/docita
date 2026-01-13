import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import sharp from 'sharp';
import { promises as fs } from 'fs';

export interface ExtractedText {
  text: string;
  confidence: number;
  documentType: 'PRESCRIPTION' | 'CASE_SHEET' | 'LAB_REPORT' | 'GENERAL';
}

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
}

interface Vitals {
  bp: string;
  temp: string;
  pulse: string;
  respiratoryRate: string;
  spO2: string;
  glucose: string;
}

interface LabValues {
  glucose: string;
  hemoglobin: string;
  creatinine: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface EmergencyContact {
  name: string;
  phoneNumber: string;
  relation: string;
}

export interface ParsedMedicalFields {
  // Patient Details
  firstName: string;
  lastName: string;
  mrn: string;
  preferredName: string;
  pronouns: string;
  address: string;
  race: string;
  ethnicity: string;
  maritalStatus: string;
  preferredLanguage: string;
  age: string;
  gender: string;
  phoneNumber: string;
  email: string;
  bloodType: string;
  emergencyContact: EmergencyContact | null;

  // Dates
  dateOfBirth: string;
  visitDate: string;
  invoiceDate: string;
  admissionDate: string;

  // Metadata
  clinicName: string;
  doctorName: string;

  // Medical Data
  diagnosis: string;
  symptoms: string[];
  allergies: string[];
  medicalHistory: string[];
  medications: Medication[];
  vitals: Vitals;
  labValues: LabValues;

  // Invoice Data
  invoice: {
    total: number | null;
    tax: number | null;
    discount: number | null;
    subtotal: number | null;
    items: InvoiceItem[];
  };

  [key: string]: unknown;
}

// Minimal interface for Tesseract Worker to avoid hard dependency on tesseract.js types
interface TesseractWorker {
  recognize(image: Buffer): Promise<TesseractResult>;
  terminate(): Promise<void>;
}

interface TesseractResult {
  data: {
    text: string;
    confidence: number;
  };
}

interface TesseractModule {
  createWorker(lang: string): Promise<TesseractWorker>;
}

@Injectable()
export class OCRService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OCRService.name);
  private worker: TesseractWorker | null = null;
  private workerReady = false;
  private Tesseract: TesseractModule | null = null;
  private tesseractAvailable = false;

  async onModuleInit() {
    this.loadTesseract();
    if (this.tesseractAvailable) {
      await this.initWorker();
    }
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  private loadTesseract() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.Tesseract = require('tesseract.js');
      this.tesseractAvailable = true;
    } catch (e) {
      this.logger.warn('Tesseract.js not found, OCR will use fallback mode');
      this.tesseractAvailable = false;
    }
  }

  private async initWorker() {
    try {
      this.logger.log('Initializing Tesseract worker...');
      if (this.Tesseract) {
        this.worker = await this.Tesseract.createWorker('eng');
        this.workerReady = true;
        this.logger.log('Tesseract worker initialized successfully');
      }
    } catch (error: any) {
      this.logger.error('Failed to initialize Tesseract worker', error);
      this.workerReady = false;
    }
  }

  /**
   * Preprocess image for better OCR accuracy
   * - Convert to grayscale
   * - Enhance contrast
   * - Resize if too small
   * - Sharpen
   * - Denoise
   */
  async preprocessImage(imagePath: string): Promise<Buffer> {
    try {
      let pipeline = sharp(imagePath);

      // Get image metadata to check dimensions
      const metadata = await pipeline.metadata();
      this.logger.debug(`Original image: ${metadata.width}x${metadata.height}`);

      // If image is too small, upscale it
      if (metadata.width && metadata.width < 1000) {
        const targetWidth = Math.round(
          (metadata.width * 1500) / (metadata.width || 1),
        );
        pipeline = pipeline.resize(targetWidth, null, {
          withoutEnlargement: false,
        });
      }

      // Convert to grayscale for better text detection
      pipeline = pipeline.grayscale();

      // Enhance contrast
      pipeline = pipeline.normalize();

      // Sharpen the image to make edges crisper
      pipeline = pipeline.sharpen({
        sigma: 1.5,
        m1: 1.0,
        m2: 0.8,
      });

      // Return buffer directly instead of saving to file
      this.logger.debug(`Preprocessing complete for ${imagePath}`);
      return await pipeline.png().toBuffer();
    } catch (error: any) {
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
    try {
      // Check if tesseract is available
      if (!this.tesseractAvailable || !this.Tesseract) {
        this.logger.warn(
          '[OCR] Tesseract.js not available in this build. Using fallback extraction.',
        );
        return {
          text: '',
          confidence: 0.05,
          documentType: 'GENERAL',
        };
      }

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

      // Ensure worker is ready
      if (!this.worker || !this.workerReady) {
        this.logger.warn('[OCR] Worker not ready, attempting to re-initialize');
        await this.initWorker();
        if (!this.worker || !this.workerReady) {
          throw new Error('Failed to initialize Tesseract worker');
        }
      }

      // Preprocess image for better accuracy
      const processedBuffer = await this.preprocessImage(imagePath);
      this.logger.log(
        `[OCR] Image preprocessed, buffer size: ${processedBuffer.length} bytes`,
      );

      this.logger.log(`[OCR] Starting Tesseract OCR for ${imagePath}`);

      // Run OCR on processed image with timeout
      let result: TesseractResult;
      try {
        result = await Promise.race([
          this.worker.recognize(processedBuffer),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Tesseract recognition timeout')),
              60000,
            ),
          ),
        ]);
        this.logger.log('[OCR] Tesseract recognition completed');
      } catch (recognizeError: any) {
        this.logger.warn(
          `[OCR] Tesseract recognition failed: ${recognizeError.message}`,
        );
        // If worker crashed/timed out, mark it as not ready for next time
        this.workerReady = false;
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
    } catch (error: any) {
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
      lowerText.includes('take') ||
      lowerText.includes('tablet') ||
      lowerText.includes('capsule')
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
      lowerText.includes('value') ||
      lowerText.includes('reference')
    ) {
      return 'LAB_REPORT';
    }

    // Case sheet indicators
    if (
      lowerText.includes('case sheet') ||
      lowerText.includes('diagnosis') ||
      lowerText.includes('chief complaint') ||
      lowerText.includes('history') ||
      lowerText.includes('examination') ||
      lowerText.includes('patient')
    ) {
      return 'CASE_SHEET';
    }

    return 'GENERAL';
  }

  /**
   * Parse extracted text into structured medical fields
   */
  parseExtractedText(text: string): ParsedMedicalFields {
    const fields: ParsedMedicalFields = {
      firstName: '',
      lastName: '',
      mrn: '',
      preferredName: '',
      pronouns: '',
      address: '',
      race: '',
      ethnicity: '',
      maritalStatus: '',
      preferredLanguage: '',
      age: '',
      gender: 'MALE',
      phoneNumber: '',
      email: '',
      bloodType: '',
      emergencyContact: null,
      dateOfBirth: '',
      visitDate: '',
      invoiceDate: '',
      admissionDate: '',
      clinicName: '',
      doctorName: '',
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
      invoice: {
        total: null,
        tax: null,
        discount: null,
        subtotal: null,
        items: [],
      },
    };

    const lines = text.split('\n');

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      const trimmedLine = line.trim();

      // --- Metadata ---
      const clinicMatch = line.match(
        /(?:hospital|clinic|center)[:\s]+([a-z\s.]+)/i,
      );
      if (clinicMatch && !fields.clinicName)
        fields.clinicName = clinicMatch[1].trim();

      const doctorMatch = line.match(/(?:doctor|dr.?)[:\s]+([a-z\s.]+)/i);
      if (doctorMatch && !fields.doctorName)
        fields.doctorName = doctorMatch[1].trim();

      // --- Dates ---
      // Common date formats: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
      const dateRegex = /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/;
      const dateMatch = line.match(dateRegex);
      if (dateMatch) {
        if (lowerLine.includes('dob') || lowerLine.includes('birth')) {
          fields.dateOfBirth = dateMatch[1];
        } else if (
          lowerLine.includes('invoice') ||
          lowerLine.includes('bill')
        ) {
          fields.invoiceDate = dateMatch[1];
        } else if (
          lowerLine.includes('admission') ||
          lowerLine.includes('admit')
        ) {
          fields.admissionDate = dateMatch[1];
        } else if (
          (lowerLine.includes('visit') || lowerLine.includes('date')) &&
          !fields.visitDate
        ) {
          fields.visitDate = dateMatch[1];
        }
      }

      // --- Patient Details ---
      const mrnMatch = line.match(
        /(?:mrn|medical record number)[:\s]+([a-z0-9-.]+)/i,
      );
      if (mrnMatch) fields.mrn = mrnMatch[1].trim();

      const prefNameMatch = line.match(
        /(?:preferred name|alias)[:\s]+([a-z\s]+)/i,
      );
      if (prefNameMatch) fields.preferredName = prefNameMatch[1].trim();

      const pronounsMatch = line.match(/(?:pronouns)[:\s]+([a-z/]+)/i);
      if (pronounsMatch) fields.pronouns = pronounsMatch[1].trim();

      const addressMatch = line.match(/(?:address)[:\s]+([a-z0-9\s,.-]+)/i);
      if (addressMatch && addressMatch[1].length > 5)
        fields.address = addressMatch[1].trim();

      const maritalMatch = line.match(/(?:marital status)[:\s]+([a-z]+)/i);
      if (maritalMatch) fields.maritalStatus = maritalMatch[1].trim();

      const langMatch = line.match(/(?:language)[:\s]+([a-z]+)/i);
      if (langMatch) fields.preferredLanguage = langMatch[1].trim();

      const raceMatch = line.match(/(?:race)[:\s]+([a-z]+)/i);
      if (raceMatch) fields.race = raceMatch[1].trim();

      const ethnicityMatch = line.match(/(?:ethnicity)[:\s]+([a-z\s]+)/i);
      if (ethnicityMatch) fields.ethnicity = ethnicityMatch[1].trim();

      // Emergency Contact
      const ecMatch = line.match(
        /(?:emergency contact|emergency)[:\s]+([a-z\s]+)(?:[:\s-]+)?(\d+)?/i,
      );
      if (ecMatch) {
        fields.emergencyContact = {
          name: ecMatch[1].trim(),
          phoneNumber: ecMatch[2] ? ecMatch[2].trim() : '',
          relation: '', // Hard to extract reliably without specific label
        };
      }

      // --- Invoice Data ---
      // --- Invoice Data ---
      // Matches: 1,700.00 OR 1700.00
      const totalMatch = line.match(
        /(?:total|grand total|amount due)[:\s]+(?:[$€£₹]|rs.?)?\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?)/i,
      );
      if (totalMatch)
        fields.invoice.total = parseFloat(totalMatch[1].replace(/,/g, ''));

      const taxMatch = line.match(
        /(?:tax|vat|gst)[:\s]+(?:[$€£₹]|rs.?)?\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?)/i,
      );
      if (taxMatch)
        fields.invoice.tax = parseFloat(taxMatch[1].replace(/,/g, ''));

      const discountMatch = line.match(
        /(?:discount)[:\s]+(?:[$€£₹]|rs.?)?\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?)/i,
      );
      if (discountMatch)
        fields.invoice.discount = parseFloat(
          discountMatch[1].replace(/,/g, ''),
        );

      const subtotalMatch = line.match(
        /(?:subtotal)[:\s]+(?:[$€£₹]|rs.?)?\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?)/i,
      );
      if (subtotalMatch)
        fields.invoice.subtotal = parseFloat(
          subtotalMatch[1].replace(/,/g, ''),
        );

      // Invoice Line Items (Heuristic: Description ... Price)
      // Look for lines ending in a number (price) with some text before it
      const itemMatch = line.match(
        /^([a-zA-Z0-9\s-.]+?)\s+(\d+)\s+(?:[$€£₹]|rs.?)?((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?)$/i,
      );
      // Format: Description Quantity UnitPrice OR Description TotalPrice.
      // Simplified: Description ... TotalPrice
      const simpleItemMatch = line.match(
        /^([a-zA-Z0-9\s-.]+?)\s+(?:[$€£₹]|rs.?)?((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?)$/i,
      );

      if (
        simpleItemMatch &&
        ![
          'total',
          'subtotal',
          'tax',
          'discount',
          'amount',
          'balance',
          'grand',
        ].some((k) => lowerLine.includes(k))
      ) {
        // Likely an item line
        fields.invoice.items.push({
          description: simpleItemMatch[1].trim(),
          quantity: 1, // Default
          unitPrice: parseFloat(simpleItemMatch[2].replace(/,/g, '')),
          total: parseFloat(simpleItemMatch[2].replace(/,/g, '')),
        });
      }

      // --- Existing Parsing Logic ---

      // Extract phone numbers (10 digits)
      // Enhanced regex to handle common formats like +91, spaces, dashes
      const phoneMatch = line.match(
        /(?:(?:\+|0{0,2})91(\s*[-]\s*)?|[0]?)?[6789]\d{9}\b/,
      );
      if (phoneMatch && !fields.phoneNumber) {
        fields.phoneNumber = phoneMatch[0].replace(/\D/g, '').slice(-10);
      }

      // Extract email
      const emailMatch = line.match(
        /([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
      );
      if (emailMatch && !fields.email) {
        fields.email = emailMatch[1];
      }

      // Extract age
      const ageMatch = line.match(/(?:age|yrs|years)[:\s]*(\d{1,3})/i);
      if (ageMatch && !fields.age) {
        fields.age = ageMatch[1];
      }

      // Extract blood type
      const bloodMatch = line.match(
        /\b(O|A|B|AB)\s*[+-]\s*(?:ve)?\b|\bBlood\s*Group\s*[:-]\s*(O|A|B|AB)[\s-]*([+-])/i,
      );
      if (bloodMatch && !fields.bloodType) {
        if (bloodMatch[1]) {
          // Direct match like O+ or O +ve
          fields.bloodType = bloodMatch[0].replace('ve', '').replace(/\s/g, '');
        } else if (bloodMatch[2] && bloodMatch[3]) {
          // Match from "Blood Group: O+"
          fields.bloodType = `${bloodMatch[2]}${bloodMatch[3]}`;
        }
      }

      // Extract vital signs - BP
      // Supports 120/80, 120 / 80, 120/80mmHg
      const bpMatch = line.match(/(\d{2,3})\s*[/]\s*(\d{2,3})\s*(?:mmhg)?/i);
      if (bpMatch && !fields.vitals.bp) {
        fields.vitals.bp = `${bpMatch[1]}/${bpMatch[2]}`;
      }

      // Extract temperature
      const tempMatch = line.match(
        /(?:temp|t).?\s*[:-]?\s*(\d+.?\d*)\s*(?:°|c|f)?/i,
      );
      if (tempMatch && !fields.vitals.temp) {
        const val = parseFloat(tempMatch[1]);
        // Simple sanity check for temp to rely on context or typical ranges
        if (val > 35 && val < 105) {
          fields.vitals.temp = tempMatch[1];
        }
      }

      // Extract pulse/HR
      const pulseMatch = line.match(
        /(?:pulse|hr|heart\s*rate|p).?\s*[:-]?\s*(\d{2,3})/i,
      );
      if (pulseMatch && !fields.vitals.pulse) {
        const val = parseInt(pulseMatch[1]);
        if (val > 40 && val < 200) {
          fields.vitals.pulse = pulseMatch[1];
        }
      }

      // Extract SpO2
      const spo2Match = line.match(/(?:spo2|sat).?\s*[:-]?\s*(\d{2,3})\s*%/i);
      if (spo2Match && !fields.vitals.spO2) {
        fields.vitals.spO2 = spo2Match[1];
      }

      // Extract medications (format: "medication name - dosage")
      // Improved to capture starting number if list
      const medMatch = line.match(
        /(?:^\d+.?\s*)?([a-zA-Z\s]+?)\s*[-:]?\s*(\d+\s*(?:mg|ml|tabs?|units?|caps?|gm))/i,
      );
      if (
        medMatch &&
        lowerLine.includes('medication') === false &&
        lowerLine.includes('temp') === false && // avoid capturing "temp 98" as med
        fields.medications.length < 10
      ) {
        const med: Medication = {
          name: medMatch[1].trim(),
          dosage: medMatch[2].trim(),
          frequency: '',
          route: '',
          duration: '',
        };

        // Try to extract frequency
        const freqMatch = line.match(
          /(?:once|twice|thrice|1x|2x|3x|bd|tid|qid|qd|hs|sos)\s*(?:daily)?/i,
        );
        if (freqMatch) {
          med.frequency = freqMatch[0];
        }

        fields.medications.push(med);
      }

      // Extract lab values
      if (lowerLine.includes('hemoglobin') || lowerLine.includes('hb')) {
        const valueMatch = line.match(/(\d+.?\d*)\s*(?:g\/dl|gm\/dl)?/i);
        if (valueMatch) {
          fields.labValues.hemoglobin = valueMatch[1];
        }
      }

      if (
        lowerLine.includes('glucose') ||
        lowerLine.includes('blood sugar') ||
        lowerLine.includes('bsl') ||
        lowerLine.includes('rbs') ||
        lowerLine.includes('fbs')
      ) {
        const valueMatch = line.match(/(\d+.?\d*)\s*(?:mg\/dl)?/i);
        if (valueMatch) {
          fields.labValues.glucose = valueMatch[1];
        }
      }

      if (lowerLine.includes('creatinine')) {
        const valueMatch = line.match(/(\d+.?\d*)\s*(?:mg\/dl)?/i);
        if (valueMatch) {
          fields.labValues.creatinine = valueMatch[1];
        }
      }

      // Extract diagnosis
      if (
        (lowerLine.includes('diagnosis') ||
          lowerLine.includes('diagnosed') ||
          lowerLine.includes('imp:')) &&
        !fields.diagnosis
      ) {
        const diagMatch = line.match(/(?:diagnosis|imp)[:\s]+([^,]+)/i);
        if (diagMatch) {
          fields.diagnosis = diagMatch[1].trim();
        }
      }

      // Extract names
      // Enhanced to look for "Name:" prefix which is common
      const namePrefixMatch = line.match(
        /(?:name|patient|pt)[:\s]+([a-z\s.]+)/i,
      );
      if (namePrefixMatch && !fields.firstName) {
        const fullName = namePrefixMatch[1].trim();
        const parts = fullName.split(' ');
        if (parts.length >= 1) fields.firstName = parts[0];
        if (parts.length >= 2) fields.lastName = parts.slice(1).join(' ');
      } else if (!fields.firstName && line.match(/^[A-Z][a-z]+\s[A-Z][a-z]+/)) {
        // Heuristic: capitalized words at start of line, avoiding header keywords not in exclusion list
        const commonHeaders = [
          'hospital',
          'clinic',
          'doctor',
          'dr.',
          'date',
          'age',
          'sex',
          'gender',
        ];
        if (!commonHeaders.some((h) => lowerLine.startsWith(h))) {
          const names = line.match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+)/);
          if (names) {
            fields.firstName = names[1];
            fields.lastName = names[2];
          }
        }
      }

      // Extract Gender
      if (!fields.gender || fields.gender === 'MALE') {
        // MALE is default, so check if we can find more specific
        if (
          lowerLine.match(/\b(?:sex|gender)[:\s]*f/i) ||
          lowerLine.match(/\bfemale\b/)
        ) {
          fields.gender = 'FEMALE';
        } else if (
          lowerLine.match(/\b(?:sex|gender)[:\s]*m/i) ||
          lowerLine.match(/\bmale\b/)
        ) {
          fields.gender = 'MALE';
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
    fields: ParsedMedicalFields,
  ): Record<string, number> {
    const scores: Record<string, number> = {};

    // Default scores based on field presence and text quality
    // Patient Details
    scores.firstName = fields.firstName ? 0.7 : 0.2;
    scores.lastName = fields.lastName ? 0.7 : 0.2;
    scores.mrn = fields.mrn ? 0.85 : 0.2;
    scores.preferredName = fields.preferredName ? 0.7 : 0.2;
    scores.pronouns = fields.pronouns ? 0.8 : 0.2;
    scores.address = fields.address ? 0.7 : 0.2;
    scores.maritalStatus = fields.maritalStatus ? 0.7 : 0.2;
    scores.preferredLanguage = fields.preferredLanguage ? 0.7 : 0.2;
    scores.race = fields.race ? 0.7 : 0.2;
    scores.ethnicity = fields.ethnicity ? 0.7 : 0.2;
    scores.age = fields.age ? 0.8 : 0.2;
    scores.phoneNumber = fields.phoneNumber ? 0.85 : 0.2;
    scores.email = fields.email ? 0.9 : 0.2;
    scores.bloodType = fields.bloodType ? 0.75 : 0.2;
    scores.emergencyContact = fields.emergencyContact ? 0.8 : 0.2;

    // Dates
    scores.dateOfBirth = fields.dateOfBirth ? 0.9 : 0.2;
    scores.visitDate = fields.visitDate ? 0.8 : 0.2;
    scores.invoiceDate = fields.invoiceDate ? 0.8 : 0.2;
    scores.admissionDate = fields.admissionDate ? 0.8 : 0.2;

    // Metadata
    scores.clinicName = fields.clinicName ? 0.7 : 0.2;
    scores.doctorName = fields.doctorName ? 0.7 : 0.2;

    // Medical Data
    scores.diagnosis = fields.diagnosis ? 0.65 : 0.2;

    // Vitals confidence
    scores['vitals.bp'] = fields.vitals?.bp ? 0.8 : 0.2;
    scores['vitals.temp'] = fields.vitals?.temp ? 0.75 : 0.2;
    scores['vitals.pulse'] = fields.vitals?.pulse ? 0.8 : 0.2;
    scores['vitals.spO2'] = fields.vitals?.spO2 ? 0.8 : 0.2;

    // Lab values confidence
    scores['labValues.glucose'] = fields.labValues?.glucose ? 0.8 : 0.2;
    scores['labValues.hemoglobin'] = fields.labValues?.hemoglobin ? 0.8 : 0.2;
    scores['labValues.creatinine'] = fields.labValues?.creatinine ? 0.8 : 0.2;

    // Array fields
    scores.medications = fields.medications?.length > 0 ? 0.7 : 0.2;
    scores.symptoms = fields.symptoms?.length > 0 ? 0.5 : 0.2;
    scores.allergies = fields.allergies?.length > 0 ? 0.5 : 0.2;

    // Invoice confidence
    scores['invoice.total'] = fields.invoice?.total !== null ? 0.85 : 0.2;
    scores['invoice.items'] = fields.invoice?.items?.length > 0 ? 0.7 : 0.2;

    return scores;
  }
}
