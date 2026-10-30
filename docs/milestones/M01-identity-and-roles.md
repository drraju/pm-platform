# Milestone 01 — Identity and roles

**Depends on:** nothing. **Blocks:** every later milestone.

## Outcome

A person signs in with Google when it is configured, or with email and password when it is not, or when the account is local-only. An admin can give that person more than one global role.

## In scope

- Sign-in screen with Google first, and email and password under it.
- The API accepts the origin the UI is served from. Local development allows both `localhost` and `127.0.0.1`.
- Invite by email. The first Google sign-in links that email. Unknown emails are refused.
- A local-only flag for test users and one break-glass Super Admin.
- Boot refuses the development fallback password outside local development.
- Many global roles on one person, from the catalog in [roles and access](../product/roles-and-access.md).
- The session returns permission keys. Remove the UI branch that treats the role name `CUSTOMER` as a special lockout.
- Stop granting `raid.read` to commercial and external roles. The new keys exist so later milestones can grant them. Their menus do not appear yet.
- Assign roles on the existing user admin screen. Store multiple roles. Do not design the final People page here.

## Out of scope

- Customers, the project redesign, Today, Slack, notifications.
- SCIM, self-serve signup, and a catalog of Google domains.
- External customer login.

## Acceptance

- A local-only user can sign in when Google is unset.
- With Google configured, an invited email signs in with Google and receives the stored roles, not a default admin.
- An email that was not invited cannot create a session.
- One user can be Customer Success Manager and Project Manager. The session lists both, and the permission set is the union.
- Sign-in on `127.0.0.1` succeeds when the app is opened on that host.
- A production-mode boot fails while the break-glass password is the seed fallback.
- No screen decides access by comparing a role name to `CUSTOMER`.
