import { Injectable } from '@nestjs/common';
import { OpenaiService } from './openai.service';

export interface AskAiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AskAiStreamRequest {
  prompt: string;
  history?: AskAiMessage[];
  scope?: {
    id: string;
    label: string;
    payload?: Record<string, unknown>;
  } | null;
  signal?: AbortSignal;
}

const SYSTEM_PROMPT = `You are an assistant inside Docita, a clinic operations app used by doctors and clinic admins in India.

Style:
- Answer in concise plain text. Default to under 120 words unless asked for more.
- Use short bullet lists when listing more than two items.
- Never invent patient data, lab values, dosages, or appointment details. If a specific patient or schedule isn't in context, say what you'd need.

Safety:
- Suggestions are decision support, not medical advice. Recommend the clinician verify dosing, contraindications, and patient-specific factors before acting.
- Refuse to produce final clinical decisions without clinician sign-off.

Scope:
- Topics in-scope: queue summarization, drafting follow-up messages, explaining schedule blocks, answering "what would you do next" questions about workflows, summarizing visit notes the user pastes in.
- For anything outside Docita workflows, say so briefly and steer back.`;

@Injectable()
export class AskAiService {
  constructor(private readonly openai: OpenaiService) {}

  async *stream(req: AskAiStreamRequest): AsyncGenerator<string, void, void> {
    const history = (req.history ?? []).slice(-12);
    const scopeLine = req.scope
      ? `Current scope: ${req.scope.label} (id=${req.scope.id}).`
      : 'Current scope: clinic-wide.';
    const systemPrompt = `${SYSTEM_PROMPT}\n\n${scopeLine}`;

    yield* this.openai.streamChatCompletion({
      systemPrompt,
      signal: req.signal,
      messages: [...history, { role: 'user', content: req.prompt }],
    });
  }
}
