import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { promises as fs } from 'fs';

/**
 * ImagePreprocessorService - Handles image preprocessing for OCR
 * Responsibilities:
 * - Image loading and reading
 * - Resizing and upscaling
 * - Grayscale conversion
 * - Contrast enhancement
 * - Image sharpening
 */
@Injectable()
export class ImagePreprocessorService {
  private readonly logger = new Logger(ImagePreprocessorService.name);

  /**
   * Preprocess image for better OCR accuracy
   * Applies grayscale, normalization, sharpening, and upscaling
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
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Image preprocessing failed: ${err.message}`);
      // Return original image buffer if preprocessing fails
      return await fs.readFile(imagePath);
    }
  }

  /**
   * Load raw image file from disk
   */
  async loadImageFile(imagePath: string): Promise<Buffer> {
    try {
      return await fs.readFile(imagePath);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to load image file: ${err.message}`);
      throw err;
    }
  }

  /**
   * Verify file exists and is readable
   */
  async verifyImageFileExists(imagePath: string): Promise<boolean> {
    try {
      await fs.readFile(imagePath);
      return true;
    } catch {
      return false;
    }
  }
}
