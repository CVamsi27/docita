import { Injectable } from '@nestjs/common';
import { getEnv } from './app-config';

@Injectable()
export class StorageConfigService {
  getStorageProvider(): 'local' | 'r2' {
    return getEnv().STORAGE_PROVIDER;
  }

  getR2Config() {
    const config = getEnv();
    return {
      accountId: config.R2_ACCOUNT_ID || '',
      accessKeyId: config.R2_ACCESS_KEY_ID || '',
      secretAccessKey: config.R2_SECRET_ACCESS_KEY || '',
      bucketName: config.R2_BUCKET_NAME || '',
    };
  }
}
