import { Logger } from 'nestjs-pino';
import { asType } from '@/test-utils';
import {
  classifyTransientQueueError,
  DlqReplayScheduler,
} from './dlq-replay.scheduler';
import type { IQueueProvider } from './queue.interface';

describe('DlqReplayScheduler', () => {
  const scheduler = new DlqReplayScheduler(
    asType<IQueueProvider>({}),
    asType<Logger>({ warn: jest.fn() }),
  );

  it.each([
    ['upstream returned 503', 'upstream_5xx'],
    ['request timed out after 10s', 'timeout'],
    ['ECONNRESET while posting', 'network'],
    ['429 Too Many Requests', 'rate_limited'],
    ['validation failed', null],
  ])('classifies %s as %s', (message, expected) => {
    expect(classifyTransientQueueError(message)).toBe(expected);
  });

  it('selects only transient jobs below the replay cap', () => {
    expect(
      scheduler.classifyForReplay([
        { id: 'retry', failedReason: 'upstream 503', replayCount: 2 },
        { id: 'capped', failedReason: 'upstream 503', replayCount: 3 },
        { id: 'permanent', failedReason: 'invalid payload', replayCount: 1 },
      ]),
    ).toEqual([{ id: 'retry', failedReason: 'upstream 503', replayCount: 2 }]);
  });
});
