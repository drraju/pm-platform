# STAB-IAM-002 Identity and User Administration

## Flow

```text
PLATFORM_ADMIN -> Administration / User Administration
  -> UsersController -> UsersService
  -> PasswordUpdateService -> PasswordPolicyService + PasswordService
  -> UsersService.updatePassword / lifecycle audit

User -> Login
  -> AuthController -> AuthService
  -> UsersService.findByEmail + PasswordService.verifyPassword
  -> disabled users rejected
  -> first_login_pending users receive requiresPasswordChange session
```

## Architecture Summary

- User Administration is the centralized workspace for user lifecycle operations.
- Only `PLATFORM_ADMIN` can list, create, edit, enable, disable, or reset users.
- Role assignment reuses the existing seven canonical roles.
- Password creation and administrator resets reuse `PasswordUpdateService`, `PasswordPolicyService`, and `PasswordService`.
- User deletion is not supported; delete requests are treated as disable operations.
- Login no longer exposes self-registration or public password reset links.

## Lifecycle Audit

Administrative actions append compact account-history entries on the user record and emit structured logs:

- `UserCreated`
- `UserUpdated`
- `RoleChanged`
- `PasswordReset`
- `UserEnabled`
- `UserDisabled`

Passwords are never logged.

## Remaining Boundaries

- External SIEM export is not implemented.
- Historical login event tables are not implemented; `last_login_at` supports current administration views.
