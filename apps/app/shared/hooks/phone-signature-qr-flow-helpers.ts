import { isRecord } from "@workspace/utils";

export interface PhoneSignatureQrSession {
  sessionId: string;
  qrUrl: string;
  contextId?: string;
}

export interface UsePhoneSignatureQrFlowOptions {
  createSession: () => Promise<PhoneSignatureQrSession>;
  checkUploaded: (session: PhoneSignatureQrSession) => Promise<boolean>;
  onUploaded?: (session: PhoneSignatureQrSession) => void;
  autoStart?: boolean;
  initialUploaded?: boolean;
  pollIntervalMs?: number;
  persistenceKey?: string;
}

export function readPersistedSession(
  key?: string,
): PhoneSignatureQrSession | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      typeof parsed.sessionId !== "string" ||
      !parsed.sessionId.trim() ||
      typeof parsed.qrUrl !== "string" ||
      !parsed.qrUrl.trim()
    ) {
      sessionStorage.removeItem(key);
      return null;
    }
    return {
      sessionId: parsed.sessionId,
      qrUrl: parsed.qrUrl,
      contextId:
        typeof parsed.contextId === "string" && parsed.contextId.trim()
          ? parsed.contextId
          : undefined,
    };
  } catch {
    sessionStorage.removeItem(key);
    return null;
  }
}

export function persistSession(
  key: string | undefined,
  session: PhoneSignatureQrSession | null,
): void {
  if (!key || typeof window === "undefined") return;
  try {
    if (!session) {
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, JSON.stringify(session));
  } catch {
    // Ignore storage failures in private browsing/quota-limited environments.
  }
}
