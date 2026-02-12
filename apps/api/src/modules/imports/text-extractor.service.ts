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

/**
 * TextExtractorService - Handles OCR extraction using Tesseract
 * Responsibilities:
 * - Tesseract library loading
 * - Worker initialization and lifecycle
 * - Text recognition from image buffers
 * - Error handling and fallback strategies
 */
@Injectable()
export class TextExtractorService {
  private readonly logger = new Logger(TextExtractorService.name);
  private worker: TesseractWorker | null = null;
  private workerReady = false;
  private Tesseract: TesseractModule | null = null;
  private tesseractAvailable = false;

  /**
   * Initialize Tesseract module and worker
   */
  async initialize(): Promise<void> {
    await this.loadTesseract();
    if (this.tesseractAvailable) {
      await this.initWorker();
    }
  }

  /**
   * Cleanup - terminate worker
   */
  async cleanup(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * Load Tesseract library dynamically
   */
  private async loadTesseract(): Promise<void> {
    try {
      this.Tesseract = (await import('tesseract.js'))
        .default as unknown as TesseractModule;
      this.tesseractAvailable = true;
    } catch (e) {
      this.logger.warn('Tesseract.js not found, OCR will use fallback mode');
      this.tesseractAvailable = false;
    }
  }

  /**
   * Initialize Tesseract worker for text recognition
   */
  private async initWorker(): Promise<void> {
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

  /**
   * Check if Tesseract is available and worker is ready
   */
  isAvailable(): boolean {
    return this.tesseractAvailable && this.workerReady;
  }

  /**
   * Extract text from image buffer using Tesseract
   */
  async extractTextFromBuffer(imageBuffer: Buffer): Promise<string> {
    // Ensure worker is ready
    if (!this.worker || !this.workerReady) {
      this.logger.warn('[OCR] Worker not ready, attempting to re-initialize');
      await this.initWorker();
      if (!this.worker || !this.workerReady) {
        throw new Error('Failed to initialize Tesseract worker');
      }
    }

    this.logger.log('[OCR] Starting Tesseract OCR');

    try {
      // Run OCR with timeout
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
      // Mark worker as not ready for next time if it crashed/timed out
      this.workerReady = false;
      throw err;
    }
  }
}
