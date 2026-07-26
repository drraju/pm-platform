import { Module } from '@nestjs/common';
import { PasswordPolicyService } from './password-policy.service';
import { PasswordService } from './password.service';

@Module({
  providers: [PasswordPolicyService, PasswordService],
  exports: [PasswordPolicyService, PasswordService],
})
export class PasswordModule {}
