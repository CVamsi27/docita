import { Test, TestingModule } from '@nestjs/testing';
import { AskAiService } from './ask-ai.service';
import { OpenaiService } from './openai.service';

async function collect(gen: AsyncGenerator<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const chunk of gen) out.push(chunk);
  return out;
}

describe('AskAiService', () => {
  let service: AskAiService;
  let streamMock: jest.Mock;

  beforeEach(async () => {
    streamMock = jest
      .fn<
        AsyncGenerator<string>,
        [Parameters<OpenaiService['streamChatCompletion']>[0]]
      >()
      .mockImplementation(async function* () {
        yield 'Hello';
        yield ' world';
      });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AskAiService,
        {
          provide: OpenaiService,
          useValue: { streamChatCompletion: streamMock },
        },
      ],
    }).compile();
    service = module.get(AskAiService);
  });

  it('forwards OpenAI deltas to the caller', async () => {
    const chunks = await collect(
      service.stream({ prompt: 'Summarize today', history: [] }),
    );
    expect(chunks).toEqual(['Hello', ' world']);
  });

  it('embeds the scope label into the system prompt', async () => {
    await collect(
      service.stream({
        prompt: 'What next?',
        scope: { id: 'patient:abc', label: 'on Patient ABC' },
      }),
    );
    const call = streamMock.mock.calls[0]?.[0];
    expect(call?.systemPrompt).toMatch(/on Patient ABC/);
    expect(call?.systemPrompt).toMatch(/patient:abc/);
  });

  it('defaults to clinic-wide scope when none supplied', async () => {
    await collect(service.stream({ prompt: 'Anything?' }));
    expect(streamMock.mock.calls[0]?.[0].systemPrompt).toMatch(/clinic-wide/);
  });

  it('caps history at the last 12 turns', async () => {
    const history = Array.from({ length: 30 }, (_, i) => ({
      role: 'user' as const,
      content: `msg-${i}`,
    }));
    await collect(service.stream({ prompt: 'next', history }));
    const passed = streamMock.mock.calls[0]?.[0].messages ?? [];
    expect(passed).toHaveLength(13);
    expect(passed[0]?.content).toBe('msg-18');
    expect(passed[passed.length - 1]?.content).toBe('next');
  });
});
