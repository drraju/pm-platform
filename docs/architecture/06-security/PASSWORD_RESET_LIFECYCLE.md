# STAB-SEC-001 Password Reset Lifecycle

## Authentication Flow

```text
User -> Login Page -> Forgot Password
Forgot Password -> AuthController -> AuthService -> PasswordResetService
PasswordResetService -> UsersService: lookup normalized email
PasswordResetService -> PasswordResetToken: store SHA-256 token hash only
PasswordResetService -> PasswordResetEmailService: send raw-token reset URL

User -> Reset Password Page -> AuthController -> AuthService -> PasswordResetService
PasswordResetService -> PasswordResetToken: validate hash, expiry, single-use state
PasswordResetService -> PasswordUpdateService: resetPasswordForUser
PasswordUpdateService -> PasswordPolicyService: enforce policy
PasswordUpdateService -> PasswordService: hash password
PasswordUpdateService -> UsersService: persist password hash and password_changed_at
PasswordResetService -> PasswordResetToken: mark used and invalidate outstanding tokens
```

## Architecture Summary

- `PasswordService` remains responsible for hashing and verification only.
- `PasswordPolicyService` remains responsible for password rules only.
- `PasswordUpdateService` now owns both change-password and reset-password update workflows.
- `PasswordResetService` owns token generation, token hashing, token validation, rate limiting, email coordination, and reset orchestration.
- `AuthService` delegates reset actions and does not implement token or password update logic directly.

## Database Summary

Migration `032_stab_sec_001_password_reset_tokens.sql` creates `password_reset_tokens` with:

- `token_hash` as a unique SHA-256 hash.
- `expires_at` and `used_at` for expiration and single-use enforcement.
- `user_id` with cascade cleanup when a user is removed.
- active-token and expiry indexes for validation and cleanup.

Plaintext reset tokens are never stored.

## Security Review

- Forgot-password responses are generic for existing and unknown emails.
- Tokens use 32 cryptographically secure random bytes, meeting 256-bit entropy.
- Token comparisons use `crypto.timingSafeEqual`.
- Expired, unknown, inactive-user, and used tokens return the same generic reset failure.
- Successful reset marks the token used and invalidates other outstanding reset tokens for the same user.
- Rate limiting is enforced in memory per normalized email and requester IP.
- Audit events are logged for reset request, reset completion, reset password update, and email queueing.

## Known Boundaries

- Email delivery is abstracted behind `PasswordResetEmailService`; configured environments can post the rendered email to `PASSWORD_RESET_EMAIL_WEBHOOK_URL`, while local development records delivery metadata without logging raw reset tokens.
- MFA, password expiry, session revocation, retention policies, and scheduled token cleanup are intentionally out of scope for this task.
