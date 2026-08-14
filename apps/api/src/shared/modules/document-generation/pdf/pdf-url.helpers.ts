import {
  GENERATED_PDF_SIGNED_URL_TTL_SECONDS,
  StorageProvider,
} from '@/domains/documents/application/ports/storage-provider.port';

export async function generatePdfSignedUrl(
  storageProvider: StorageProvider,
  key: string,
): Promise<{ type: 'url'; url: string }> {
  const url = await storageProvider.generateSignedUrl(
    key,
    GENERATED_PDF_SIGNED_URL_TTL_SECONDS,
  );
  return { type: 'url', url };
}
