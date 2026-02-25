export interface SendMessageRequest {
  to: string;
  templateName?: string;
  languageCode?: string;
  components?: Array<Record<string, unknown>>;
  text?: string;
}

export interface SendInteractiveRequest {
  to: string;
  bodyText: string;
  buttons: Array<{ id: string; title: string }>;
  headerText?: string;
  footerText?: string;
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
