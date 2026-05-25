export interface ResolvedWhatsappSender {
  phoneNumberId: string;
  accessToken: string;
  mode: 'SHARED' | 'BYO' | 'MANAGED';
  senderPhoneNumberId: string | null;
  displayName?: string | null;
  fallbackActive: boolean;
}

export interface SendMessageRequest {
  to: string;
  templateName?: string;
  languageCode?: string;
  components?: Array<Record<string, unknown>>;
  text?: string;
  sender?: ResolvedWhatsappSender;
}

export interface SendInteractiveRequest {
  to: string;
  bodyText: string;
  buttons: Array<{ id: string; title: string }>;
  headerText?: string;
  footerText?: string;
  sender?: ResolvedWhatsappSender;
}

export interface SendMessageResponse {
  externalId: string;
}

export interface IWhatsAppClient {
  sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;
  sendInteractiveMessage(
    request: SendInteractiveRequest,
  ): Promise<SendMessageResponse>;
  checkHealth(): Promise<boolean>;
}

export const WHATSAPP_CLIENT_TOKEN = 'IWhatsAppClient';
