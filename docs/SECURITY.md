# Fintivi Security Documentation

## Authentication

### JWT Access Tokens

- **Algorithm:** HS256 signed with `JWT_ACCESS_SECRET` (min 32 chars)
- **Expiry:** 15 minutes
- **Payload:** `{ id: string, market: string }`
- Signed via `@fastify/jwt` with `expiresIn: '15m'`
- Required on all protected routes via `requireAuth` middleware

### Refresh Tokens

- **Expiry:** 30 days
- **Rotation:** Each use of a refresh token returns a new token pair. The old token is invalidated.
- **Reuse detection:** If a previously rotated token is reused, the session is revoked and `401 TOKEN_REUSED` is returned (prevents token theft).
- Stored as SHA-256 hash in the `sessions` table — raw token never persisted.

### Session Management

- Sessions are created on signup, login, OTP verify, and Google OAuth callback.
- Sessions are revoked on logout or refresh token reuse.
- Each session tracks `user_agent` and `ip_address` for audit.
- No session limit per user.

### OTP Authentication

- Phone numbers are hashed with `PHONE_HASH_PEPPER` before storage using SHA-256.
- OTP codes are stored as SHA-256 hashes — plaintext code is never stored.
- OTP rate limited to 3 requests per 15 minutes per phone (in-app limiter using `otp_attempts` table).
- OTP codes expire (configurable via auth package).
- In test/dev mode with `OTP_PROVIDER=test`, codes are returned in the response for convenience.

### Google OAuth

- Uses Google's official OAuth 2.0 flow with `openid email` scope.
- ID tokens verified using `jose.jwtVerify` against Google's JWKS endpoint (`www.googleapis.com/oauth2/v3/certs`).
- Token audience must match `GOOGLE_CLIENT_ID`.
- New users created via Google link are assigned the `global` market by default.

---

## Authorization

### Ownership Checks (`requireOwner` middleware)

All user-scoped resources enforce ownership via `requireOwner(table, idParamName)`:

```typescript
// For every protected route:
const record = await db.select().from(table)
  .where(and(eq(table.id, id), eq(table.userId, userId)))
  .limit(1)

if (!record) return 404 NOT_FOUND
```

Resources using ownership checks:

| Resource | Middleware | Applied to |
|----------|-----------|------------|
| Accounts | `requireOwner(accounts, 'id')` | PATCH, DELETE |
| Transactions | `requireOwner(transactions, 'id')` | GET, PATCH, POST split, DELETE |
| Category rules | `requireOwner(categoryRules, 'id')` | PATCH, DELETE |
| Uploads | `getJobWithOwnerCheck()` | GET, stream, preview, confirm |

### User Data Isolation

- All list endpoints filter by `user_id`: accounts, transactions, uploads, dashboard.
- Categories return system categories + only the calling user's custom categories.
- Dashboard data is fully scoped to the authenticated user.
- Cross-user access returns `404 NOT_FOUND` (not `403`) to avoid leaking resource existence.

---

## Rate Limiting

### Global Rate Limiter

- Served by `@fastify/rate-limit`.
- Disabled in test mode.
- Production: 100 requests per minute globally.

### Route-Level Limits

- Disabled in test mode for auth routes.

| Route | Limit | Window | Notes |
|-------|-------|--------|-------|
| POST /auth/signup | 10 | 15 minutes | Disabled in test |
| POST /auth/login | 10 | 15 minutes | Disabled in test |
| POST /auth/otp/verify | 10 | 15 minutes | Disabled in test |

### Application-Level Limits (always active)

| Route | Limit | Window | Mechanism |
|-------|-------|--------|-----------|
| POST /auth/otp/request | 3 | 15 minutes | `otp_attempts` table, active in all environments |
| POST /uploads | 20 files | per day per user | Count query on `upload_jobs` table |
| GET /uploads/:jobId/stream | 5 concurrent | per user | In-memory counter |

---

## Upload Safety

### File Validation

| Check | Implementation |
|-------|---------------|
| Extension whitelist | `.csv`, `.pdf`, `.xls`, `.xlsx` |
| MIME type | Validated from multipart upload |
| File size limit | 20 MB (`20 * 1024 * 1024` bytes), enforced by `@fastify/multipart` |
| Content validation | Parser validates file structure after upload |

### Supported Formats

- **Generic CSV:** Date/Description/Amount columns (global market)
- **HDFC CSV:** Transaction Date/Narration/Debit/Credit columns (India market)
- Other formats detected via parser `sniff()` and `detect()` functions

### Data Retention

| Data | Retention |
|------|-----------|
| Raw upload files | Not permanently stored — parsed immediately in-memory |
| Upload job metadata | Retained indefinitely (includes transaction data and warnings) |
| Upload job events | Retained indefinitely (progress/status history) |
| Transactions | Retained until explicitly deleted by user |

> **Note:** Raw file content is parsed in-memory and is not stored to disk. The file name, size, and MIME type are persisted in `upload_jobs`. Parsed transaction data is stored in `upload_jobs.metadata` (JSONB) until the job is confirmed or deleted.

---

## Audit Logging

All sensitive actions are logged to the `audit_logs` table via `writeAuditLog()`:

| Action | Trigger |
|--------|---------|
| `signup` | Email/password registration |
| `login` | Successful email/password login |
| `otp_verify` | Successful OTP verification |
| `google_link` | Google OAuth account link |
| `logout` | Session revocation |

Each audit entry records:
- `userId` — who performed the action
- `action` — the action name
- `details` — JSONB payload with action-specific metadata (e.g., `{ provider: 'password' }`, `{ googleSub: '...' }`)
- `ipAddress` — originating IP
- `createdAt` — timestamp

---

## Secrets Management

| Secret | Env Variable | Requirements |
|--------|-------------|-------------|
| JWT signing key | `JWT_ACCESS_SECRET` | Min 32 characters |
| Refresh token signing | `REFRESH_TOKEN_SECRET` | Min 32 characters |
| Phone hash pepper | `PHONE_HASH_PEPPER` | Min 16 characters |
| OTP provider | `OTP_PROVIDER` | `"test"` or `"twilio"` |
| Google Client ID | `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| Google Client Secret | `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| Database URL | `DATABASE_URL` | PostgreSQL connection string |

### Security Best Practices

- **No secrets in logs:** Logger is disabled when `NODE_ENV=test`. Passwords are never logged.
- **No secrets in code:** All secrets are env-var based, validated at startup via Zod schema.
- **Password hashing:** Passwords are hashed using a dedicated auth package (not stored in cleartext).
- **Phone hashing:** Phone numbers are SHA-256 hashed with pepper before storage.
- **Token hashing:** Refresh tokens are SHA-256 hashed before database storage.

---

## Threat Mitigations

| Threat | Mitigation |
|--------|-----------|
| Brute force login | 10 requests/15min rate limit |
| OTP brute force | 3 requests/15min rate limit, OTP expiry |
| Refresh token theft | Rotation + reuse detection |
| Cross-user data access | Ownership middleware, user-scoped queries, 404 on not-found |
| Upload abuse | 20 files/day limit, file type validation, 20MB limit |
| Session hijacking | JWT expiry (15min), refresh token rotation |
| Information disclosure | 404 instead of 403, no raw secrets in logs |
