import { BadRequestException, Injectable } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

type GoogleOAuthStatePayload = Readonly<{
  issuedAt: number;
  nonce: string;
}>;

const STATE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class GoogleOAuthStateService {
  createState(): string {
    const payload: GoogleOAuthStatePayload = {
      issuedAt: Date.now(),
      nonce: randomBytes(24).toString('base64url'),
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );

    return `${encodedPayload}.${this.sign(encodedPayload)}`;
  }

  validateState(state: string): GoogleOAuthStatePayload {
    const [encodedPayload, signature] = state.split('.');
    if (!encodedPayload || !signature) {
      throw new BadRequestException('Invalid Google OAuth state.');
    }

    const expectedSignature = this.sign(encodedPayload);
    if (!constantTimeEquals(signature, expectedSignature)) {
      throw new BadRequestException('Invalid Google OAuth state.');
    }

    const payload = parseStatePayload(encodedPayload);
    if (Date.now() - payload.issuedAt > STATE_TTL_MS) {
      throw new BadRequestException('Expired Google OAuth state.');
    }

    return payload;
  }

  private sign(encodedPayload: string): string {
    return createHmac('sha256', this.secret())
      .update(encodedPayload)
      .digest('base64url');
  }

  private secret(): string {
    const secret =
      process.env.GOOGLE_OAUTH_STATE_SECRET ??
      process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY ??
      process.env.GOOGLE_CLIENT_SECRET;

    if (!secret) {
      throw new Error(
        'GOOGLE_OAUTH_STATE_SECRET, INTEGRATION_TOKEN_ENCRYPTION_KEY, or GOOGLE_CLIENT_SECRET is required.',
      );
    }

    return secret;
  }
}

function parseStatePayload(encodedPayload: string): GoogleOAuthStatePayload {
  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as Partial<GoogleOAuthStatePayload>;

    if (
      typeof payload.issuedAt !== 'number' ||
      typeof payload.nonce !== 'string'
    ) {
      throw new Error('Malformed state payload.');
    }

    return {
      issuedAt: payload.issuedAt,
      nonce: payload.nonce,
    };
  } catch {
    throw new BadRequestException('Invalid Google OAuth state.');
  }
}

function constantTimeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
