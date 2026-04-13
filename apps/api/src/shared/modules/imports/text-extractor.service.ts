import { Injectable, Logger } from '@nestjs/common';

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

function isTesseractModule(value: unknown): value is TesseractModule {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const createWorker = (value as { createWorker?: unknown }).createWorker;
  return typeof createWorker === 'function';
}

@Injectable()
export class TextExtractorService {
  private readonly logger = new Logger(TextExtractorService.name);
  private worker: TesseractWorker | null = null;
  private workerReady = false;
  private Tesseract: TesseractModule | null = null;
  private tesseractAvailable = false;
  private initializationPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.workerReady) {
      return;
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    this.initializationPromise = (async () => {
      await this.loadTesseract();
      if (this.tesseractAvailable) {
        await this.initWorker();
      }
    })();

    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  async cleanup(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
    this.workerReady = false;
  }

  private async loadTesseract(): Promise<void> {
    try {
      const tesseractImport = await import('tesseract.js');
      const moduleCandidate =
        'default' in tesseractImport
          ? tesseractImport.default
          : tesseractImport;

      if (!isTesseractModule(moduleCandidate)) {
        throw new Error('Loaded Tesseract module does not expose createWorker');
      }

      this.Tesseract = moduleCandidate;
      this.tesseractAvailable = true;
    } catch (_e) {
      this.logger.warn('Tesseract.js not found, OCR will use fallback mode');
      this.tesseractAvailable = false;
    }
  }

  private async initWorker(): Promise<void> {
    if (this.workerReady && this.worker) {
      return;
    }

    try {
      this.logger.log('Initializing Tesseract worker...');
      if (this.Tesseract) {
        this.worker = await this.Tesseract.createWorker('eng');
        this.workerReady = true;
        this.logger.log('Tesseract worker initialized successfully');
      }
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error('Failed to initialize Tesseract worker', err);
    }
  }

  isAvailable(): boolean {
    return this.tesseractAvailable && this.workerReady;
  }

  async extractTextFromBuffer(imageBuffer: Buffer): Promise<string> {
    if (!this.worker || !this.workerReady) {
      this.logger.warn('[OCR] Worker not ready, attempting to re-initialize');
      await this.initialize();
      if (!this.worker || !this.workerReady) {
        throw new Error('Failed to initialize Tesseract worker');
      }
    }

    this.logger.log('[OCR] Starting Tesseract OCR');

    try {
      const result = await Promise.race<TesseractResult>([
        this.worker.recognize(imageBuffer),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Tesseract recognition timeout')),
            60000,
          ),
        ),
      ]);

      this.logger.log('[OCR] Tesseract recognition completed');
      return result.data.text;
    } catch (recognizeError: unknown) {
      const err = recognizeError as Error;
      this.logger.warn(`[OCR] Tesseract recognition failed: ${err.message}`);

      this.workerReady = false;
      throw err;
    }
  }
}
