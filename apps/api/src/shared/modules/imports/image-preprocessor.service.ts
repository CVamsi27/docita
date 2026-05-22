import { Injectable, Logger } from '@nestjs/common';
import { getErrorMessage } from '@workspace/utils';
import sharp from 'sharp';
import { promises as fs } from 'fs';

@Injectable()
export class ImagePreprocessorService {
  private readonly logger = new Logger(ImagePreprocessorService.name);

  async preprocessImage(imagePath: string): Promise<Buffer> {
    try {
      let pipeline = sharp(imagePath);

      const metadata = await pipeline.metadata();
      this.logger.debug(`Original image: ${metadata.width}x${metadata.height}`);

      if (metadata.width && metadata.width < 1000) {
        pipeline = pipeline.resize(1500, null, {
          withoutEnlargement: false,
        });
      }

      pipeline = pipeline.grayscale();

      pipeline = pipeline.normalize();

      pipeline = pipeline.sharpen({
        sigma: 1.5,
        m1: 1.0,
        m2: 0.8,
      });

      this.logger.debug(`Preprocessing complete for ${imagePath}`);
      return await pipeline.png().toBuffer();
    } catch (error: unknown) {
      this.logger.error(
        `Image preprocessing failed: ${getErrorMessage(error)}`,
      );

      return await fs.readFile(imagePath);
    }
  }

  async loadImageFile(imagePath: string): Promise<Buffer> {
    try {
      return await fs.readFile(imagePath);
    } catch (error: unknown) {
      this.logger.error(`Failed to load image file: ${getErrorMessage(error)}`);
      throw error;
    }
  }

  async verifyImageFileExists(imagePath: string): Promise<boolean> {
    try {
      await fs.access(imagePath);
      return true;
    } catch {
      return false;
    }
  }
}
