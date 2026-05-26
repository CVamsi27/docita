import { Injectable } from '@nestjs/common';
import { fetchWithTimeout } from '@/shared/common/http/fetch-with-timeout';
import { assertSafeExternalUrl } from '@/shared/common/http/safe-external-url';

@Injectable()
export class SignatureImageClient {
  async fetchImageBuffer(url: string): Promise<Buffer> {
    // SSRF gate — the signature URL ultimately rides on patient/doctor
    // records and must be treated as user input. See safe-external-url.ts.
    const safeUrl = assertSafeExternalUrl(url);
    const response = await fetchWithTimeout(safeUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch signature: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
