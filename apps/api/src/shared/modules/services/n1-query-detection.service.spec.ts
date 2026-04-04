import { beforeEach, describe, expect, it } from '@jest/globals';
import { N1QueryDetectionService } from './n1-query-detection.service';

describe('N1QueryDetectionService', () => {
  let service: N1QueryDetectionService;

  beforeEach(() => {
    service = new N1QueryDetectionService();
  });

  it('detects repeated query patterns as potential N+1', () => {
    for (let i = 0; i < 6; i += 1) {
      service.recordQuery(
        `SELECT * FROM appointments WHERE patient_id = ${i}`,
        12,
      );
    }

    const patterns = service.analyzeForN1Patterns();

    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0].count).toBe(6);
    expect(patterns[0].recommendation).toContain('include()');
  });

  it('caps in-memory trace history at configured maximum', () => {
    for (let i = 0; i < 260; i += 1) {
      service.recordQuery(`SELECT * FROM users WHERE id = ${i}`, 2);
    }

    const stats = service.getStatistics();
    expect(stats.totalQueries).toBe(200);
  });
});
