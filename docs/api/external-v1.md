# External API v1 Consumer Guide

## 1. Status and audience

External API v1 is the implemented, read-only extraction API for approved
external analytics and integration consumers. This guide is for integration
developers and platform administrators who provision those consumers.

The guide explains how to use the contract; the generated OpenAPI document is
the authoritative machine-readable description of request and response
schemas. External API v1 does not create or update resource data.

## 2. Base URL and live OpenAPI

Use the base URL supplied by the administrator of the target deployment:

```text
$BASE_URL
```

The live Swagger UI and generated OpenAPI document are available at:

```text
$BASE_URL/api/docs
```

Examples in this guide use placeholders. Do not copy real credentials or
tokens into source control, logs, tickets, or shared shell history.

## 3. Security model

External API requests use JWT bearer authentication. The caller must be an
active identity of type `SERVICE` with the canonical `SERVICE_USER` role. A
human identity, including a human administrator, is not an eligible External
API caller.

Every External API request is authenticated and authorized independently. The
`SERVICE_USER` role requires the `external.api.access` capability and the
resource-specific read permission listed in the authorization matrix below.
The currently implemented data scope is `ALL_PROJECTS`.

This API does not implement OAuth client credentials, API keys, or mTLS. Do not
treat a service account email and password as an OAuth client ID and secret.

## 4. SERVICE-account provisioning and lifecycle

A platform administrator with `user.manage` creates and manages service
accounts through the authenticated service-account administration routes. A
new account is assigned identity type `SERVICE` and role `SERVICE_USER`, and is
created in the disabled state.

| Operation         | Administration route                                                | Effect                                                                                      |
| ----------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Create            | `POST /users/service-accounts`                                      | Creates a disabled service account with its initial credential.                             |
| Inspect           | `GET /users/service-accounts` or `GET /users/service-accounts/{id}` | Lists service accounts or returns one account.                                              |
| Update metadata   | `PATCH /users/service-accounts/{id}`                                | Updates supported account metadata; it does not rotate the credential.                      |
| Rotate credential | `POST /users/service-accounts/{id}/rotate-credentials`              | Replaces the password and invalidates access and refresh tokens issued before the rotation. |
| Enable            | `POST /users/service-accounts/{id}/enable`                          | Makes the account eligible to authenticate.                                                 |
| Disable           | `POST /users/service-accounts/{id}/disable`                         | Prevents login and invalidates previously issued access and refresh tokens.                 |

Creation accepts `email`, `firstName`, `lastName`, and `password`. Credential
rotation accepts `newPassword`. Both credentials are checked against the
implemented password policy. The enable and disable routes require no request
body. All of these calls use the administrator's bearer access token.

Creation and lifecycle management are administrative operations, not actions
performed by the external consumer itself. The service account must be enabled
before it can log in. After a disabled account is enabled again, obtain a new
token pair; tokens invalidated by disabling do not become valid again.

Credential rotation is the implemented way to replace a service account
password. Service accounts cannot use the human self-service password-change
or password-reset lifecycle.

## 5. Login and token use

Log in with the enabled service account:

```http
POST /auth/login
Content-Type: application/json

{
  "email": "<service-account-email>",
  "password": "<service-account-password>"
}
```

A successful login returns separate access and refresh tokens:

```json
{
  "accessToken": "<access-token>",
  "refreshToken": "<refresh-token>"
}
```

Send only the access token to External API routes:

```http
Authorization: Bearer <access-token>
```

The refresh token has a distinct token type, audience, and signing secret. It
is accepted by the refresh route, not as bearer authentication for an
External API request.

## 6. Refresh and expiry

Exchange a valid refresh token for a new access/refresh pair:

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "<refresh-token>"
}
```

Access and refresh lifetimes are deployment-configurable. The implemented
defaults are 15 minutes for access tokens and 7 days for refresh tokens; a
deployment may use different values.

Refresh is stateless. The implementation does not maintain a consumer session
or a refresh-token revocation list, and using a refresh token does not by
itself consume that token. Expiry, service-account disablement, and credential
rotation are the implemented validity boundaries. Consumers should protect
both tokens and replace their stored token pair after a successful refresh.

## 7. Authorization matrix

All rows require an active `SERVICE` identity, the `SERVICE_USER` role, the
`external.api.access` capability, and `ALL_PROJECTS` scope.

| Resource | Required resource permission | Effective scope |
| -------- | ---------------------------- | --------------- |
| Projects | `external.project.read`      | `ALL_PROJECTS`  |
| Tasks    | `external.task.read`         | `ALL_PROJECTS`  |
| Risks    | `external.raid.read`         | `ALL_PROJECTS`  |
| Issues   | `external.raid.read`         | `ALL_PROJECTS`  |

There is no per-project External API scope in v1.

## 8. Endpoint overview

| Method and route            | Purpose                                                     | Item schema |
| --------------------------- | ----------------------------------------------------------- | ----------- |
| `GET /external/v1/projects` | Extract non-deleted project records for external analytics. | Project     |
| `GET /external/v1/tasks`    | Extract non-deleted task records across projects.           | Task        |
| `GET /external/v1/risks`    | Extract non-deleted risk records across projects.           | Risk        |
| `GET /external/v1/issues`   | Extract non-deleted issue records across projects.          | Issue       |

These are the only External API v1 resource endpoints.

## 9. Shared query parameters

All four endpoints accept the same query parameters.

| Parameter      | Type               | Required                                   | Default                          | Semantics                                                                                                              |
| -------------- | ------------------ | ------------------------------------------ | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `limit`        | integer, 1–1000    | No                                         | `200`                            | Maximum number of items returned in this page. It may change between pages.                                            |
| `cursor`       | string             | No                                         | none                             | Opaque signed continuation cursor returned as `nextCursor`.                                                            |
| `updatedSince` | ISO 8601 date-time | No                                         | none                             | Inclusive lower updated-time bound: `updatedAt >= updatedSince`.                                                       |
| `snapshotAt`   | ISO 8601 date-time | No on the first request; yes with a cursor | server time on the first request | Inclusive upper updated-time bound: `updatedAt <= snapshotAt`. Reuse the returned value on every continuation request. |

Timestamps must be valid ISO 8601 date-times. The server normalizes accepted
instants to canonical UTC form, so equivalent offsets refer to the same
instant. For example, `2026-09-04T10:00:00+01:00` and
`2026-09-04T09:00:00Z` normalize to the same context value.

If both time bounds are supplied, `updatedSince` must not be later than
`snapshotAt`.

## 10. Page response

Every successful endpoint returns the same page envelope, with a
resource-specific item type in `data`:

```json
{
  "data": [
    {
      "id": "4afcaa56-e48d-4fb7-9e60-92d61c68b32f",
      "name": "Example project",
      "status": "<status>",
      "startDate": null,
      "targetEndDate": null,
      "createdAt": "2026-09-01T08:30:00.000Z",
      "updatedAt": "2026-09-04T09:00:00.000Z"
    }
  ],
  "nextCursor": "<opaque-cursor>",
  "snapshotAt": "2026-09-04T12:00:00.000Z"
}
```

| Field        | Type             | Meaning                                                             |
| ------------ | ---------------- | ------------------------------------------------------------------- |
| `data`       | array            | Up to `limit` records, ordered by `(updatedAt ASC, id ASC)`.        |
| `nextCursor` | string or `null` | Cursor for the next page, or `null` when no further page was found. |
| `snapshotAt` | date-time string | Canonical UTC inclusive updated-time ceiling for this extraction.   |

To determine whether another page exists, the server requests `limit + 1`
records internally. It returns at most `limit` records and a cursor only when
the extra record shows that another page exists. The API performs no `COUNT`
query and has no total-record, total-page, or numbered-page contract.

## 11. Resource item schemas

The tables below describe the implemented external DTOs. Fields such as
status, priority, task kind, probability, impact, and severity are strings in
the external contract; this guide intentionally does not define enum values.

### Project

| Field           | Type             | Nullable |
| --------------- | ---------------- | -------- |
| `id`            | UUID string      | No       |
| `name`          | string           | No       |
| `status`        | string           | No       |
| `startDate`     | date string      | Yes      |
| `targetEndDate` | date string      | Yes      |
| `createdAt`     | date-time string | No       |
| `updatedAt`     | date-time string | No       |

### Task

| Field               | Type             | Nullable |
| ------------------- | ---------------- | -------- |
| `id`                | UUID string      | No       |
| `projectId`         | UUID string      | No       |
| `parentTaskId`      | UUID string      | Yes      |
| `title`             | string           | No       |
| `taskKind`          | string           | No       |
| `milestoneCategory` | string           | Yes      |
| `status`            | string           | No       |
| `priority`          | string           | No       |
| `percentComplete`   | integer          | No       |
| `sequenceNumber`    | integer          | Yes      |
| `startDate`         | date string      | Yes      |
| `dueDate`           | date string      | Yes      |
| `plannedStartDate`  | date string      | Yes      |
| `plannedEndDate`    | date string      | Yes      |
| `actualStartDate`   | date string      | Yes      |
| `actualEndDate`     | date string      | Yes      |
| `estimatedHours`    | number           | Yes      |
| `remainingHours`    | number           | Yes      |
| `createdAt`         | date-time string | No       |
| `updatedAt`         | date-time string | No       |

### Risk

| Field         | Type             | Nullable |
| ------------- | ---------------- | -------- |
| `id`          | UUID string      | No       |
| `projectId`   | UUID string      | No       |
| `title`       | string           | No       |
| `status`      | string           | No       |
| `probability` | string           | No       |
| `impact`      | string           | No       |
| `createdAt`   | date-time string | No       |
| `updatedAt`   | date-time string | No       |

### Issue

| Field       | Type             | Nullable |
| ----------- | ---------------- | -------- |
| `id`        | UUID string      | No       |
| `projectId` | UUID string      | No       |
| `title`     | string           | No       |
| `status`    | string           | No       |
| `severity`  | string           | No       |
| `createdAt` | date-time string | No       |
| `updatedAt` | date-time string | No       |

## 12. Full extraction

For a full extraction of one resource:

1. Send the first request without `cursor` or `snapshotAt`, optionally choosing
   a `limit`.
2. Store the `snapshotAt` returned in the first page.
3. Process the page's `data`.
4. If `nextCursor` is not `null`, request the same resource with that value as
   `cursor` and the stored `snapshotAt`.
5. Continue until `nextCursor` is `null`.

Keep the resource and time-filter context unchanged during continuation. The
page limit may change without invalidating the cursor.

## 13. Incremental extraction

Set `updatedSince` to the consumer's last successfully completed watermark.
The lower bound is inclusive, so records whose `updatedAt` equals the
watermark are included. Consumers should upsert by resource ID and tolerate
records repeated at the boundary.

The first response supplies a canonical `snapshotAt`. Include that exact
`snapshotAt`, the same `updatedSince` instant, and the returned cursor on every
continuation request. Only after every page completes successfully should a
consumer advance its own watermark to the extraction's returned `snapshotAt`.
That watermark procedure is a client-side recommendation, not a server-managed
sync state.

`snapshotAt` is an inclusive `updatedAt` ceiling. It is **not** a database
transaction snapshot or a repeatable-read/MVCC guarantee. The API constrains
rows by their updated time; it does not hold one database transaction open
across HTTP requests.

## 14. Cursor and pagination guarantees

- Results use stable keyset ordering by `(updatedAt ASC, id ASC)`.
- Continuation starts strictly after the cursor position in that ordering.
- Cursors are opaque, signed, version 2 values. Consumers must not decode,
  construct, or modify them.
- The signature cryptographically binds the cursor position to the resource,
  `snapshotAt`, and `updatedSince` context.
- A cursor from one resource cannot continue another resource. Changing or
  omitting its required extraction context causes rejection.
- The cursor is not bound to a SERVICE identity. Possession of a cursor does
  not bypass authentication or authorization; those checks run on every
  request.
- `limit` is not part of the bound context and may change between pages.
- Context timestamps are normalized to canonical UTC instants. Equivalent
  timestamp offsets therefore match the same bound context.
- Cursor version 1 is rejected. Version 2 has no backward compatibility with
  version 1.
- A malformed, tampered, unsupported-version, or context-mismatched cursor
  returns the generic `400` message `Invalid external cursor`.

## 15. Errors

External API v1 does not claim one universal error shape. Handle each status
according to its documented alternatives.

| Status             | `message`                  | `error`                  | `statusCode`  |
| ------------------ | -------------------------- | ------------------------ | ------------- |
| `400 Bad Request`  | string or array of strings | optional string          | integer `400` |
| `401 Unauthorized` | string                     | `Unauthorized` or absent | integer `401` |
| `403 Forbidden`    | string                     | string `Forbidden`       | integer `403` |

A policy denial normally has this shape:

```json
{
  "message": "External API access denied",
  "error": "Forbidden",
  "statusCode": 403
}
```

An invalid cursor deliberately has a generic response that does not disclose
whether parsing, signing, version, or context validation failed:

```json
{
  "message": "Invalid external cursor",
  "error": "Bad Request",
  "statusCode": 400
}
```

Validation failures can instead return an array in `message`:

```json
{
  "message": ["limit must not be greater than 1000"],
  "error": "Bad Request",
  "statusCode": 400
}
```

Missing, malformed, or expired access tokens return `401`. An authenticated
but ineligible identity, missing capability, missing resource permission, or
unresolved external scope returns `403`.

## 16. Deletion semantics

Soft-deleted projects, tasks, risks, and issues are excluded from External API
queries. External API v1 provides no tombstone records, deleted-ID feed, or
deletion synchronization endpoint.

Consequently, incremental extraction cannot discover deletions. A consumer
that needs its destination to match the current non-deleted record set must
design its own reconciliation using a full extraction. That is consumer-side
behavior; the server does not provide or prescribe a deletion sync mechanism.

## 17. Client examples

All values in angle brackets are placeholders. Keep credentials and tokens out
of source control and logs.

### Login and call an endpoint with curl

```sh
BASE_URL='<base-url>'

curl --request POST "$BASE_URL/auth/login" \
  --header 'Content-Type: application/json' \
  --data @- <<'JSON'
{
  "email": "<service-account-email>",
  "password": "<service-account-password>"
}
JSON
```

Copy the returned access token into a protected local variable, then request a
page. The quoted URL and `--data-urlencode` options prevent query values from
being interpreted by the shell.

```sh
ACCESS_TOKEN='<access-token>'

curl --get "$BASE_URL/external/v1/projects" \
  --header "Authorization: Bearer $ACCESS_TOKEN" \
  --header 'Accept: application/json' \
  --data-urlencode 'limit=200'
```

For a continuation request, pass the response values without inspecting or
altering the cursor:

```sh
NEXT_CURSOR='<nextCursor-from-response>'
SNAPSHOT_AT='<snapshotAt-from-first-response>'

curl --get "$BASE_URL/external/v1/projects" \
  --header "Authorization: Bearer $ACCESS_TOKEN" \
  --header 'Accept: application/json' \
  --data-urlencode 'limit=500' \
  --data-urlencode "cursor=$NEXT_CURSOR" \
  --data-urlencode "snapshotAt=$SNAPSHOT_AT"
```

If the first request used `updatedSince`, include the same instant in that
continuation request as well.

Refresh uses the refresh token in the JSON body, never in the bearer header:

```sh
curl --request POST "$BASE_URL/auth/refresh" \
  --header 'Content-Type: application/json' \
  --data @- <<'JSON'
{
  "refreshToken": "<refresh-token>"
}
JSON
```

### Pagination pseudocode

```text
resource = "tasks"
limit = 200
updatedSince = optional consumer watermark
cursor = null
snapshotAt = null

repeat:
    params = { limit }
    if updatedSince is set:
        params.updatedSince = updatedSince
    if cursor is set:
        params.cursor = cursor
        params.snapshotAt = snapshotAt

    page = GET /external/v1/{resource} with bearer access token and params

    if snapshotAt is null:
        snapshotAt = page.snapshotAt

    upsert page.data by resource id
    cursor = page.nextCursor
until cursor is null

after every page succeeds:
    optionally store snapshotAt as the next incremental watermark
```

On a failed page, retain the same cursor and extraction context if the client
chooses to retry. The API does not guarantee a server-managed retry or backoff
policy.

### Power Query / Excel with a supplied access token

Create `BaseUrl` and `AccessToken` parameters in Power Query, then use a query
like the following for a full project extraction:

```powerquery
let
    Resource = "projects",
    PageSize = "1000",
    GetPage = (Cursor as nullable text, Snapshot as nullable text) as record =>
        let
            InitialQuery = [limit = PageSize],
            WithSnapshot =
                if Snapshot = null then InitialQuery
                else Record.AddField(InitialQuery, "snapshotAt", Snapshot),
            Query =
                if Cursor = null then WithSnapshot
                else Record.AddField(WithSnapshot, "cursor", Cursor),
            Response = Json.Document(
                Web.Contents(
                    BaseUrl,
                    [
                        RelativePath = "external/v1/" & Resource,
                        Query = Query,
                        Headers = [
                            Accept = "application/json",
                            Authorization = "Bearer " & AccessToken
                        ]
                    ]
                )
            )
        in
            Response,
    FirstPage = GetPage(null, null),
    Pages = List.Generate(
        () => [Page = FirstPage],
        each [Page] <> null,
        each
            if [Page][nextCursor] = null then [Page = null]
            else [Page = GetPage([Page][nextCursor], FirstPage[snapshotAt])],
        each [Page][data]
    ),
    Records = List.Combine(Pages),
    Result = Table.FromRecords(Records)
in
    Result
```

This example accepts an access token supplied to Excel. It does not log in,
store a service-account password, or refresh tokens automatically. Supply a
new valid access token through the approved credential-handling process when
the existing token expires.

## 18. Operational limitations

- External API v1 is read-only and exposes only the four documented resources.
- Access is currently `ALL_PROJECTS`; per-project external scopes are not
  implemented.
- Pagination exposes no count, total, total pages, or numbered pages.
- `snapshotAt` is an updated-time ceiling, not a transactional snapshot.
- Deletion tombstones, deletion synchronization, and webhooks are not
  implemented.
- The API does not publish rate-limit, availability, timeout, or server retry
  and backoff guarantees.
- OAuth client credentials, API keys, and mTLS are not implemented External API
  authentication methods.
- Power Query token refresh is not automatic; clients receive and manage the
  supplied access token outside the example query.

Consumer-side retry, backoff, scheduling, secret storage, reconciliation, and
watermark management should follow the consumer organization's operational
requirements. These recommendations are not server guarantees.
