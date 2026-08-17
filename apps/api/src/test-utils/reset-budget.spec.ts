import {
  evaluateResetDuration,
  evaluateSchemaPushCount,
  evaluateSchemaPushDuration,
  MAX_SCHEMA_PUSHES_PER_PROCESS,
  RESET_FAIL_MS,
  RESET_WARN_MS,
  SCHEMA_PUSH_WARN_MS,
} from './reset-budget';

describe('evaluateResetDuration', () => {
  it('passes well below the warn threshold (measured median ~430ms)', () => {
    const result = evaluateResetDuration(430);
    expect(result.level).toBe('pass');
    expect(result.message).toBe('');
  });

  it('warns at and above the warn threshold, below the fail threshold', () => {
    const atThreshold = evaluateResetDuration(RESET_WARN_MS);
    expect(atThreshold.level).toBe('warn');
    expect(atThreshold.message).toContain('warn threshold');

    const justBelowFail = evaluateResetDuration(RESET_FAIL_MS - 1);
    expect(justBelowFail.level).toBe('warn');
  });

  it('fails at the fail threshold and beyond (regression signature)', () => {
    const atThreshold = evaluateResetDuration(RESET_FAIL_MS);
    expect(atThreshold.level).toBe('fail');
    expect(atThreshold.message).toContain('regressed');

    const oldPathSignature = evaluateResetDuration(30_000);
    expect(oldPathSignature.level).toBe('fail');
  });
});

describe('evaluateSchemaPushCount', () => {
  it('passes at the documented contract (one push per process)', () => {
    const result = evaluateSchemaPushCount(1);
    expect(result.level).toBe('pass');
    expect(result.message).toBe('');
  });

  it('fails as soon as the memoization contract is broken', () => {
    const result = evaluateSchemaPushCount(MAX_SCHEMA_PUSHES_PER_PROCESS + 1);
    expect(result.level).toBe('fail');
    expect(result.message).toContain('memoized');
    expect(result.message).toContain('#295');
  });
});

describe('evaluateSchemaPushDuration', () => {
  it('passes for a normal warm push (~1s)', () => {
    const result = evaluateSchemaPushDuration(1_200);
    expect(result.level).toBe('pass');
    expect(result.message).toBe('');
  });

  it('warns when the push approaches the 30s hook budget', () => {
    const result = evaluateSchemaPushDuration(SCHEMA_PUSH_WARN_MS);
    expect(result.level).toBe('warn');
    expect(result.message).toContain('hook budget');
  });
});
