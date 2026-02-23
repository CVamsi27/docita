// Channel interface exports
export type { IMessageChannel, MessageContent, SendMessageResult } from './message-channel.interface';

// Channel implementations
export { WhatsAppChannel } from './whatsapp.channel';
export { EmailChannel } from './email.channel';
export { SmsChannel } from './sms.channel';
