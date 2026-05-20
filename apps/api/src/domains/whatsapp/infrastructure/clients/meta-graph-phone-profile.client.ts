import { Injectable } from '@nestjs/common';
import { fetchWithTimeout } from '@/shared/common/http/fetch-with-timeout';

export type MetaPhoneNumberProfile = {
  verified_name?: string;
  display_phone_number?: string;
  error?: { message?: string };
};

@Injectable()
export class MetaGraphPhoneProfileClient {
  private readonly apiVersion = 'v21.0';
  private readonly baseUrl = 'https://graph.facebook.com';

  async fetchPhoneNumberProfile(
    phoneNumberId: string,
    accessToken: string,
  ): Promise<{ ok: boolean; data: MetaPhoneNumberProfile }> {
    const response = await fetchWithTimeout(
      `${this.baseUrl}/${this.apiVersion}/${phoneNumberId}?fields=verified_name,display_phone_number`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const data = (await response.json()) as MetaPhoneNumberProfile;
    return { ok: response.ok, data };
  }
}
