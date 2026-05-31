import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { PublicDailyThoughtService } from './public-daily-thought.service';

describe('PublicDailyThoughtService', () => {
  let service: PublicDailyThoughtService;

  beforeEach(() => {
    service = new PublicDailyThoughtService();
    global.fetch = jest.fn() as typeof fetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns quote and author from ZenQuotes', async () => {
    jest
      .mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([{ q: ' Hello world. ', a: ' Author Name ' }]),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    const result = await service.getDailyThought();

    expect(result.quote).toBe('Hello world.');
    expect(result.author).toBe('Author Name');
    expect(fetch).toHaveBeenCalledWith(
      'https://zenquotes.io/api/today',
      expect.objectContaining({
        headers: { Accept: 'application/json' },
      }),
    );
  });

  it('returns fallback when ZenQuotes returns invalid JSON', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await service.getDailyThought();

    expect(result.quote).toContain('trust');
    expect(result.author).toBe('Ernest Hemingway');
  });

  it('returns fallback when fetch fails', async () => {
    jest.mocked(fetch).mockRejectedValueOnce(new Error('network down'));

    const result = await service.getDailyThought();

    expect(result.author).toBe('Ernest Hemingway');
  });
});
