import { Injectable } from '@nestjs/common';

export type PasswordPolicyResult = {
  errors: string[];
  valid: boolean;
};

@Injectable()
export class PasswordPolicyService {
  private readonly minimumLength = 8;

  validate(password: string): PasswordPolicyResult {
    const errors: string[] = [];

    if (!password || password.trim().length === 0) {
      errors.push('New password is required');
      return { errors, valid: false };
    }

    if (password.length < this.minimumLength) {
      errors.push(
        `New password must be at least ${this.minimumLength} characters`,
      );
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('New password must include an uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('New password must include a lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('New password must include a number');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('New password must include a special character');
    }

    return { errors, valid: errors.length === 0 };
  }
}
