export const MAX_SIGNATURE_UPLOAD_BYTES = 5 * 1024 * 1024;

export function validateSignatureImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Please choose an image file";
  }

  if (file.size > MAX_SIGNATURE_UPLOAD_BYTES) {
    return "Use a file smaller than 5 MB";
  }

  return null;
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)?.[1] || "image/png";
  const decoded = atob(parts[1]);
  const bytes = new Uint8Array(decoded.length);

  for (let i = 0; i < decoded.length; i += 1) {
    bytes[i] = decoded.charCodeAt(i);
  }

  return new File([bytes], filename, { type: mime });
}
