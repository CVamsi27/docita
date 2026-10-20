import { Writable } from 'node:stream';
import pinoHttp from 'pino-http';
import { buildPinoOptions } from './pino-options.factory';

describe('Pino request URL privacy', () => {
  it('removes capabilities from the emitted structured request and access message', () => {
    const canary = 'synthetic-capability-canary';
    const chunks: string[] = [];
    const destination = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        chunks.push(chunk.toString());
        callback();
      },
    });
    const logger = pinoHttp(
      buildPinoOptions({ isProduction: true }),
      destination,
    ).logger;

    logger.info(
      {
        req: {
          id: 'r-1',
          method: 'POST',
          url: `/api/v1/doctors/signature/upload/${canary}?X-Amz-Signature=${canary}`,
        },
        payload: { path: `/upload-signature/${canary}` },
      },
      `POST /api/v1/doctors/signature/upload/${canary} 201 10ms`,
    );

    const output = chunks.join('');
    expect(output).not.toContain(canary);
    expect(output).toContain('/api/v1/doctors/signature/upload/[REDACTED]');
    expect(output).toContain('201 10ms');
    expect(output).toContain('"id":"r-1"');
  });
});
