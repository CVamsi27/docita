import { Injectable, Logger } from '@nestjs/common';
import Razorpay from 'razorpay';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RazorpayClientService {
  private readonly logger = new Logger(RazorpayClientService.name);
  private razorpay: Razorpay | null = null;

  constructor(private configService: ConfigService) {
    this.initialize();
  }

  private initialize(): void {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      this.logger.warn('Razorpay credentials not configured');
      return;
    }

    try {
      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      this.logger.log('Razorpay client initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Razorpay', error);
    }
  }

  getClient(): Razorpay {
    if (!this.razorpay) {
      throw new Error('Razorpay client not initialized');
    }
    return this.razorpay;
  }

  async isAvailable(): Promise<boolean> {
    return this.razorpay !== null;
  }
}
