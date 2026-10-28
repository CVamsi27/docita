import { requireMetricsTestDatabaseTarget } from './test-database-target';

describe('metrics fixture database target', () => {
  it('accepts the dedicated loopback database', () => {
    const target =
      'postgresql://docita_bench@127.0.0.1:55438/docita_capacity_fixture';
    expect(requireMetricsTestDatabaseTarget(target)).toBe(target);
  });

  it.each([
    undefined,
    'invalid-url-with-private-content',
    'postgresql://user:private-value@db.example.com/docita_capacity_fixture',
    'postgresql://user@127.0.0.1/docita',
    'postgresql://user@127.0.0.1/docita_capacity_',
    'postgresql://user@127.0.0.1/docita_capacity_fixture?options=-csearch_path%3Dpublic',
    'postgresql://user@127.0.0.1/docita_capacity_fixture#fragment',
    'https://127.0.0.1/docita_capacity_fixture',
  ])(
    'rejects unsafe or missing targets without echoing credentials',
    (target) => {
      expect(() => requireMetricsTestDatabaseTarget(target)).toThrow();
      try {
        requireMetricsTestDatabaseTarget(target);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).not.toContain('private-value');
        }
      }
    },
  );
});
