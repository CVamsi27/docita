import { assertTyped } from '@workspace/data-access/lib/typed-http-boundary';
export async function browserRequest(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, init);
}

export async function browserJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await browserRequest(input, init);
  if (!response.ok) {
    throw new Error(String(response.status));
  }
  return assertTyped<T>(await response.json());
}

export async function browserBlob(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Blob> {
  const response = await browserRequest(input, init);
  if (!response.ok) {
    throw new Error(String(response.status));
  }
  return response.blob();
}
