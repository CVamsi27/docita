import { Injectable } from '@nestjs/common';
import { fetchWithTimeout } from '@/shared/common/http/fetch-with-timeout';

@Injectable()
export class SignatureImageClient {
  async fetchImageBuffer(url: string): Promise<Buffer> {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch signature: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
