import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

function toBuffer(value: Uint8Array | ArrayBuffer | string): Buffer {
  if (typeof value === 'string') {
    return Buffer.from(value);
  }

  if (value instanceof ArrayBuffer) {
    return Buffer.from(value);
  }

  return Buffer.from(value);
}

class NodeCryptoPlugin {
  name = 'node-crypto';

  hmac(
    algorithm: 'sha1' | 'sha256' | 'sha512',
    key: Uint8Array | ArrayBuffer | string,
    message: Uint8Array | ArrayBuffer | string,
  ): Uint8Array {
    const digest = createHmac(algorithm, toBuffer(key))
      .update(toBuffer(message))
      .digest();

    return new Uint8Array(digest);
  }

  randomBytes(size: number): Uint8Array {
    return new Uint8Array(randomBytes(size));
  }

  constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}

export const crypto = Object.freeze(new NodeCryptoPlugin());
export const NobleCryptoPlugin = NodeCryptoPlugin;
export default NodeCryptoPlugin;
