import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PasswordPolicyService } from './password-policy.service';

@Injectable()
export class PasswordService {
  constructor(private readonly passwordPolicyService: PasswordPolicyService) {}

  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }

  validateNewPassword(password: string): void {
    const result = this.passwordPolicyService.validate(password);
    if (!result.valid) {
      throw new BadRequestException(result.errors);
    }
  }
}
