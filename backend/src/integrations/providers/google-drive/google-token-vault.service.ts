import { Injectable } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

@Injectable()
export class GoogleTokenVault {
  encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return [
      iv.toString('base64url'),
      tag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  decrypt(value: string): string {
    const [ivValue, tagValue, encryptedValue] = value.split('.');
    if (!ivValue || !tagValue || !encryptedValue) {
      throw new Error('Invalid encrypted token payload.');
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key(),
      Buffer.from(ivValue, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  private key(): Buffer {
    const secret =
      process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ??
      process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY ??
      process.env.GOOGLE_CLIENT_SECRET;

    if (!secret) {
      throw new Error(
        'GOOGLE_TOKEN_ENCRYPTION_KEY or INTEGRATION_TOKEN_ENCRYPTION_KEY is required.',
      );
    }

    return createHash('sha256').update(secret).digest();
  }
}
