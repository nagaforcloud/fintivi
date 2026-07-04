# Fintivi Backend Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Merge `perfin` and `perfin-in` into one dual-market backend engine with a clean REST API, starting with the smallest useful flow: signup/login -> upload financial data -> parse/import transactions -> show dashboard data.

**Architecture:** Fintivi ships as one Fastify API server in a pnpm/turbo monorepo. Domain code lives in packages, but P0 only implements the vertical slice needed for upload-to-dashboard. The design keeps SaaS seams for later while avoiding P0 billing and production multi-tenant complexity.

**Tech Stack:** TypeScript, Fastify, Drizzle, PostgreSQL, pnpm workspaces, Turbo, Vitest, Zod, JWT access tokens, DB-backed refresh sessions, Google OAuth, email/password auth, phone OTP auth, Docker Compose.

## Global Constraints

- Product posture: hybrid later. P0 can run as a private/single-deployment app, but every user-owned row and endpoint must be scoped by `user_id` so hosted SaaS is not blocked later.
- Market posture: dual-market day one. P0 must support `market = "global" | "india"` explicitly. Do not infer market from locale, currency, or auth method.
- First slice: manual upload -> parser dispatch -> transaction import -> transaction/dashboard read API.
- P0 auth: email/password, phone OTP, and Google OAuth are all in scope.
- P0 data posture: fresh database only. No migration of existing perfin or perfin-in production data.
- P0 billing posture: billing is deferred. Do not implement Stripe or Razorpay endpoints in P0. Keep provider-neutral billing design notes for P1.
- Database IDs: use UUID text IDs for users and user-owned records. Do not mix integer and string `userId` types.
- Security posture: financial data, inbound emails, uploaded files, phone numbers, OAuth identities, and chat/proposal content are sensitive. Redact them from logs.
- Testing posture: each task must land with unit or integration tests before implementation continues.
- Frontend posture: backend first, but every P0 endpoint must have a frontend contract with request, response, loading, empty, error, and partial-success behavior.

---

## 1. Review Verdict

The original plan had the right direction, but it was not implementation-ready. It listed nearly the whole product backend as Phase 3, left identity/auth/migration questions open, and mixed backend scope with frontend design-system scope.

This revised plan fixes that by making these decisions explicit:

| Decision | Final choice | Implementation consequence |
|---|---|---|
| Product mode | Hybrid later | Scope all rows by `user_id`; defer billing and org tenants. |
| Market | Dual-market day one | Add explicit `market`; support global and India parser paths in P0. |
| First slice | Upload -> dashboard | P0 excludes Plaid, billing, investments, agent, notifications, and tax calendars. |
| Auth | Email/password + phone OTP + Google OAuth | Use `auth_identities` so multiple login methods can belong to one user. |
| Database | Fresh DB only | Create clean migration history; do not preserve old app data. |
| Billing | Deferred | No checkout/webhook endpoints in P0; add P1 provider-neutral billing plan. |

## 2. P0 Scope

P0 is the first working backend slice. It should be small enough to finish and verify, but complete enough that a frontend can show a real dashboard from uploaded data.

### P0 must include

- Monorepo scaffold with one Fastify API server.
- Package identity under `@fintivi/*`.
- Fresh P0 database schema.
- Users, auth identities, refresh sessions, OTP attempts, accounts, transactions, categories, upload jobs, ingestion events, and audit logs.
- Email/password signup and login.
- Phone OTP request and verify.
- Google OAuth start and callback.
- JWT access tokens and rotating DB-backed refresh sessions.
- Explicit user market selection: `global` or `india`.
- Manual account creation.
- Manual upload of CSV/PDF/Excel files.
- Parser dispatch with both global generic parser path and India bank parser path.
- Import preview and partial-success handling.
- Transactions list/detail/update.
- Categories and basic category rules.
- Dashboard summary endpoint for the frontend.
- Upload job status and SSE progress stream backed by DB state.
- Ownership checks for every `:id` route.
- Rate limits for auth, OTP, upload, refresh, and expensive endpoints.
- API integration tests for every P0 endpoint.

### P0 must not include

- Stripe checkout.
- Razorpay checkout.
- Subscription billing webhooks.
- Plaid Link and Plaid sync.
- Postmark inbound email ingestion.
- AI agent chat or write proposals.
- Investments portfolio APIs.
- Push notifications.
- Tax calendar and ITR deadline surfaces.
- Full frontend design system.

### P1 candidates after P0 is stable

- Plaid connections and sync.
- Postmark inbound email ingestion for UPI and global bank alerts.
- Provider-neutral billing with Stripe and Razorpay.
- Investments: SIP, MF, FD, PPF, NPS, Gold, SGB.
- Recurring series, anomalies, monthly narratives, and richer insights.
- AI assistant read-only mode, then write proposals with confirmation.
- Notifications and alerts.
- Dedicated frontend design-system plan.

## 3. Target Repository Structure

```text
fintivi/
├── apps/
│   └── api/
│       ├── src/
│       │   ├── server.ts
│       │   ├── env.ts
│       │   ├── plugins/
│       │   │   ├── auth.ts
│       │   │   ├── rate-limit.ts
│       │   │   └── request-context.ts
│       │   ├── middleware/
│       │   │   ├── require-auth.ts
│       │   │   └── require-owner.ts
│       │   ├── routes/
│       │   │   ├── health.ts
│       │   │   ├── auth.ts
│       │   │   ├── users.ts
│       │   │   ├── accounts.ts
│       │   │   ├── uploads.ts
│       │   │   ├── transactions.ts
│       │   │   ├── categories.ts
│       │   │   └── dashboard.ts
│       │   └── lib/
│       │       ├── jobs.ts
│       │       ├── sse.ts
│       │       └── audit.ts
│       └── tests/
│           ├── auth.test.ts
│           ├── ownership.test.ts
│           ├── uploads.test.ts
│           ├── transactions.test.ts
│           └── dashboard.test.ts
│
├── packages/
│   ├── db/
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   ├── client.ts
│   │   │   └── ids.ts
│   │   └── migrations/
│   │       └── 0000_initial.sql
│   ├── auth/
│   │   ├── src/
│   │   │   ├── password.ts
│   │   │   ├── otp.ts
│   │   │   ├── google.ts
│   │   │   ├── sessions.ts
│   │   │   └── identities.ts
│   │   └── tests/
│   ├── parsers/
│   │   ├── src/
│   │   │   ├── dispatch.ts
│   │   │   ├── types.ts
│   │   │   ├── generic/
│   │   │   └── india/
│   │   └── fixtures/
│   ├── core/
│   │   ├── src/
│   │   │   ├── transactions/
│   │   │   ├── categories/
│   │   │   └── dashboard/
│   │   └── tests/
│   └── config/
│       ├── tsconfig/
│       └── eslint/
│
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## 4. System Flow

```text
Client
  |
  | signup/login/otp/google
  v
Fastify API
  |
  | creates access JWT + rotating refresh session
  v
Postgres

Client
  |
  | POST /api/v1/uploads
  v
Fastify API
  |
  | creates upload_jobs row
  v
Parser dispatcher
  |
  | market/account-aware parser selection
  v
Import preview
  |
  | user confirms import
  v
Transactions + categories
  |
  | GET /api/v1/dashboard
  v
Dashboard response
```

## 5. Identity And Auth Contract

### Canonical identity model

Use `users.id` as a UUID text primary key everywhere. Do not carry forward `perfin` integer user IDs.

```text
users
  id uuid text primary key
  email nullable unique when present
  phone_e164 nullable unique when present
  display_name nullable
  market enum('global', 'india') not null
  locale text not null
  currency text not null
  created_at timestamp not null
  updated_at timestamp not null

auth_identities
  id uuid text primary key
  user_id uuid text references users(id)
  provider enum('password', 'phone_otp', 'google') not null
  provider_subject text not null
  verified_at timestamp nullable
  created_at timestamp not null
  unique(provider, provider_subject)

sessions
  id uuid text primary key
  user_id uuid text references users(id)
  refresh_token_hash text not null
  user_agent text nullable
  ip_hash text nullable
  expires_at timestamp not null
  revoked_at timestamp nullable
  created_at timestamp not null
```

### Auth behavior

- Access token: JWT, 15 minute TTL, signed with `JWT_ACCESS_SECRET`.
- Refresh token: opaque random token, 30 day TTL, hashed in `sessions`.
- Refresh behavior: rotate refresh token on every refresh; revoke previous session token.
- Logout behavior: revoke the active refresh session.
- Password storage: Argon2id or bcrypt with cost configured in env.
- Phone storage: normalize to E.164; use `phone_hash = HMAC(PHONE_HASH_PEPPER, phone_e164)` for OTP attempts.
- OTP behavior: 6 digits, 5 minute TTL, single use, max 5 verify attempts, resend cooldown 60 seconds, generic responses to prevent enumeration.
- Google OAuth behavior: callback creates or links `auth_identities(provider='google')` by verified Google subject. If Google email matches an existing verified user email, link to that user.
- Account linking rule: one user can have password, phone OTP, and Google identities. Linking must require proof of control of the new identity.

### Auth endpoints

```text
POST /api/v1/auth/signup
POST /api/v1/auth/login
POST /api/v1/auth/otp/request
POST /api/v1/auth/otp/verify
GET  /api/v1/auth/google/start
GET  /api/v1/auth/google/callback
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/users/me
PATCH /api/v1/users/me
```

## 6. Market Model

Market is a product capability set, not a formatting preference.

```ts
type Market = "global" | "india";

type UserPreferences = {
  market: Market;
  locale: string;
  currency: string;
};
```

P0 rules:

- `market='global'` defaults to `locale='en-US'`, `currency='USD'`.
- `market='india'` defaults to `locale='en-IN'`, `currency='INR'`.
- Users may change locale and currency without changing market.
- Parser dispatch may use market as a hint, but file content and account metadata must drive final parser selection.
- Billing provider must never be inferred from locale in P0 because billing is deferred.

## 7. Parser And Upload Contract

### Parser dispatcher

Parser selection must avoid silent false positives. Parsers return confidence and a preview. Low-confidence imports require explicit user confirmation.

```ts
export type ParserMarket = "global" | "india";

export type ParserCandidate = {
  parserId: string;
  market: ParserMarket;
  confidence: number;
  accountName?: string;
  detectedBank?: string;
  warnings: string[];
};

export type ParsedTransaction = {
  postedAt: string;
  description: string;
  amountMinor: number;
  currency: string;
  externalFingerprint: string;
  raw: Record<string, unknown>;
};
```

### Upload flow

```text
POST /api/v1/uploads
  -> validates file size/type
  -> creates upload_jobs row
  -> returns job id

GET /api/v1/uploads/:jobId/stream
  -> authenticates user
  -> verifies upload_jobs.user_id owns job
  -> emits latest persisted state first
  -> streams progress events

GET /api/v1/uploads/:jobId/preview
  -> returns parser candidates and parsed rows

POST /api/v1/uploads/:jobId/confirm
  -> imports selected rows idempotently
  -> returns imported/skipped/duplicate counts
```

### Upload states

```text
queued -> validating -> parsing -> preview_ready -> importing -> completed
queued -> validating -> failed
queued -> validating -> parsing -> failed
queued -> validating -> parsing -> preview_ready -> importing -> completed_with_warnings
```

## 8. P0 REST API

Base URL: `http://localhost:8001/api/v1`

### Health

```text
GET /health
GET /health/ready
```

### Auth and users

```text
POST  /auth/signup
POST  /auth/login
POST  /auth/otp/request
POST  /auth/otp/verify
GET   /auth/google/start
GET   /auth/google/callback
POST  /auth/refresh
POST  /auth/logout
GET   /users/me
PATCH /users/me
```

### Accounts

```text
GET    /accounts
POST   /accounts
PATCH  /accounts/:id
DELETE /accounts/:id
```

### Uploads

```text
POST /uploads
GET  /uploads/:jobId
GET  /uploads/:jobId/stream
GET  /uploads/:jobId/preview
POST /uploads/:jobId/confirm
```

### Transactions

```text
GET   /transactions
GET   /transactions/:id
PATCH /transactions/:id
POST  /transactions/:id/split
DELETE /transactions/:id
```

### Categories

```text
GET    /categories
POST   /categories/rules
PATCH  /categories/rules/:id
DELETE /categories/rules/:id
```

### Dashboard

```text
GET /dashboard
```

Dashboard response must include:

```json
{
  "data": {
    "range": { "from": "2026-07-01", "to": "2026-07-31" },
    "currency": "INR",
    "cashflow": { "incomeMinor": 0, "expenseMinor": 0, "netMinor": 0 },
    "accounts": [],
    "recentTransactions": [],
    "categoryBreakdown": [],
    "dataHealth": {
      "lastUploadAt": null,
      "pendingReviewCount": 0,
      "failedUploadCount": 0
    }
  }
}
```

### Response conventions

```json
{ "data": { "id": "..." } }
{ "data": [], "meta": { "page": 1, "perPage": 50, "total": 0 } }
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid request", "details": [] } }
```

### SSE conventions

```text
event: progress
data: { "stage": "parsing", "percent": 45, "message": "Parsing statement" }

event: complete
data: { "jobId": "...", "result": { "imported": 42, "skipped": 3, "duplicates": 2 } }
```

## 9. P0 Database Tables

Create `packages/db/migrations/0000_initial.sql` for a fresh database only.

| Table | P0 purpose |
|---|---|
| `users` | Canonical user profile and market. |
| `auth_identities` | Password, phone OTP, and Google identity links. |
| `sessions` | Rotating refresh sessions. |
| `otp_attempts` | OTP request/verify state, abuse controls. |
| `accounts` | Manual bank/cash/credit accounts. |
| `transactions` | Ledger rows imported from uploads. |
| `transaction_splits` | Split transaction child rows. |
| `categories` | System and user categories. |
| `category_rules` | Basic categorization rules. |
| `upload_jobs` | DB-backed upload job lifecycle. |
| `upload_job_events` | Progress replay and SSE reconnect support. |
| `ingestion_events` | Idempotency and source fingerprints. |
| `audit_logs` | Sensitive action audit trail. |

Every user-owned table must have `user_id`. Every `:id` route must query by both `id` and `user_id`.

## 10. Security Requirements

### Authorization

- `requireAuth` verifies access JWT and attaches `request.user.id`.
- `requireOwner(table, idParam)` must enforce user ownership for path IDs.
- Integration tests must prove User A cannot read, stream, update, delete, or confirm User B resources.

### Rate limits

| Endpoint class | Limit |
|---|---|
| OTP request | 3 per phone per 15 minutes, 10 per IP per hour. |
| OTP verify | 5 attempts per OTP request. |
| Login/signup | 10 per IP per 15 minutes. |
| Refresh | 30 per user per hour. |
| Upload | 20 files per user per day in P0. |
| SSE streams | 5 concurrent streams per user. |

### Upload safety

- Require auth for upload, preview, confirm, and stream.
- Max file size: 20 MB.
- Allow extensions: `.csv`, `.pdf`, `.xls`, `.xlsx`.
- Validate MIME and content signature; do not trust file extension alone.
- Reject Excel macros and active content.
- Neutralize CSV formula cells before preview/export.
- Store raw upload only for the retention window.
- Retention window: delete raw upload files after 7 days or immediately after successful import if local storage is used.

### Secrets

- Required P0 env vars: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `REFRESH_TOKEN_SECRET`, `PHONE_HASH_PEPPER`, `OTP_PROVIDER`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
- Do not log access tokens, refresh tokens, OAuth codes, OTPs, phone numbers, uploaded file contents, transaction descriptions, or parser raw rows.

### Audit logging

Log these actions in `audit_logs`:

- Signup, login, logout, refresh-token reuse detection.
- OTP request and verification result without storing OTP value.
- Google identity link.
- Account create/update/delete.
- Upload create/preview/confirm/failure.
- Transaction update/delete/split.
- Category rule create/update/delete.

## 11. Package Merge Strategy

Use `@fintivi/*` package names. Pay the import-rewrite cost now so the merged product is not tied to old repo naming.

| Source | Destination | Action |
|---|---|---|
| `perfin/packages/db` | `packages/db` | Use as reference only. Rebuild fresh UUID schema. |
| `perfin-in/packages/db` | `packages/db` | Port OTP concepts and phone-first fields. |
| `perfin/packages/core` | `packages/core` | Port transaction/category/dashboard logic needed for P0. |
| `perfin-in/packages/core` | `packages/core` | Port India-specific category/parser tests relevant to P0. |
| `perfin/packages/extractors` | `packages/parsers/src/generic` | Preserve generic CSV/PDF/Excel parsing. |
| `perfin-in/packages/parsers-in` | `packages/parsers/src/india` | Preserve India bank parser path. |
| `perfin-in/packages/auth-in` | `packages/auth` | Port OTP flows and provider abstraction. |
| `perfin/apps/web/lib/auth.ts` | `packages/auth` | Port concepts only; do not depend on NextAuth in Fastify. |
| `perfin/packages/billing` | P1 | Defer. Design provider-neutral schema before porting. |
| `perfin/packages/billing-in` | P1 | Defer. Do not create `packages/billing-in` in P0. |
| `perfin/packages/agent` | P1 | Defer. Add read-only then proposal mode later. |
| `perfin/packages/investments` | P1 | Defer. Port after dashboard core works. |
| `perfin/packages/connectors` | P1 | Defer Plaid/Postmark until after manual upload slice. |
| `perfin-in/packages/connectors-in` | P1 | Defer Postmark-in until inbound email slice. |

## 12. Implementation Tasks

### Task 1: Monorepo scaffold

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `docker-compose.yml`
- Create: `apps/api/package.json`
- Create: `apps/api/src/server.ts`
- Create: `apps/api/src/env.ts`
- Create: `packages/config/tsconfig/base.json`

**Produces:** runnable Fastify server and workspace scripts.

- [ ] Create pnpm workspace with `apps/*` and `packages/*`.
- [ ] Add scripts: `dev`, `build`, `test`, `lint`, `typecheck`, `db:migrate`.
- [ ] Add Docker Compose PostgreSQL service named `fintivi-postgres` on port `5432`.
- [ ] Implement `GET /api/v1/health` returning `{ "data": { "ok": true } }`.
- [ ] Add Vitest test proving health endpoint returns 200.
- [ ] Run `pnpm install`.
- [ ] Run `pnpm test` and verify health test passes.

### Task 2: Fresh P0 database schema

**Files:**

- Create: `packages/db/package.json`
- Create: `packages/db/src/client.ts`
- Create: `packages/db/src/ids.ts`
- Create: `packages/db/src/schema/*.ts`
- Create: `packages/db/migrations/0000_initial.sql`
- Create: `packages/db/tests/schema.test.ts`

**Produces:** UUID-based schema with no integer `userId` assumptions.

- [ ] Write tests that assert `users.id`, `accounts.user_id`, `transactions.user_id`, `upload_jobs.user_id`, and `sessions.user_id` use the same UUID text type.
- [ ] Create P0 schema tables listed in Section 9.
- [ ] Add unique indexes for `auth_identities(provider, provider_subject)`, `sessions(refresh_token_hash)`, and transaction source fingerprints.
- [ ] Add indexes for transaction list queries: `(user_id, posted_at desc)`, `(user_id, account_id, posted_at desc)`, `(user_id, category_id, posted_at desc)`.
- [ ] Add migration command and test DB setup.
- [ ] Run `pnpm --filter @fintivi/db test`.

### Task 3: Auth package

**Files:**

- Create: `packages/auth/package.json`
- Create: `packages/auth/src/password.ts`
- Create: `packages/auth/src/otp.ts`
- Create: `packages/auth/src/google.ts`
- Create: `packages/auth/src/sessions.ts`
- Create: `packages/auth/src/identities.ts`
- Create: `packages/auth/tests/*.test.ts`

**Produces:** reusable auth primitives for API routes.

- [ ] Test password signup creates user plus `auth_identities(provider='password')`.
- [ ] Test phone OTP request stores hashed OTP attempt and never stores raw OTP.
- [ ] Test OTP verify creates or links `auth_identities(provider='phone_otp')`.
- [ ] Test Google callback creates or links `auth_identities(provider='google')` by provider subject.
- [ ] Test refresh-token rotation revokes previous refresh token.
- [ ] Test refresh-token reuse detection revokes the session family and writes an audit log.
- [ ] Implement password hashing and verification.
- [ ] Implement OTP request/verify service with rate-limit hooks.
- [ ] Implement Google OAuth verifier and identity linker.
- [ ] Implement session create/refresh/revoke.
- [ ] Run `pnpm --filter @fintivi/auth test`.

### Task 4: API auth and ownership middleware

**Files:**

- Create: `apps/api/src/plugins/auth.ts`
- Create: `apps/api/src/plugins/rate-limit.ts`
- Create: `apps/api/src/middleware/require-auth.ts`
- Create: `apps/api/src/middleware/require-owner.ts`
- Create: `apps/api/src/lib/audit.ts`
- Create: `apps/api/tests/auth.test.ts`
- Create: `apps/api/tests/ownership.test.ts`

**Produces:** protected route foundation.

- [ ] Add failing tests for signup, login, OTP request, OTP verify, Google callback, refresh, logout, and `/users/me`.
- [ ] Add cross-user tests proving User A receives 404 or 403 for User B account/upload/transaction IDs.
- [ ] Register auth routes.
- [ ] Register rate limits from Section 10.
- [ ] Implement `requireAuth` from access JWT.
- [ ] Implement `requireOwner` query helper that always scopes by `user_id`.
- [ ] Run `pnpm --filter @fintivi/api test auth ownership`.

### Task 5: Parser package and fixtures

**Files:**

- Create: `packages/parsers/package.json`
- Create: `packages/parsers/src/types.ts`
- Create: `packages/parsers/src/dispatch.ts`
- Create: `packages/parsers/src/generic/*`
- Create: `packages/parsers/src/india/*`
- Create: `packages/parsers/fixtures/global/sample.csv`
- Create: `packages/parsers/fixtures/india/sample.csv`
- Create: `packages/parsers/tests/dispatch.test.ts`

**Produces:** confidence-based parser dispatcher.

- [ ] Test global sample chooses a generic parser with confidence >= 0.8.
- [ ] Test India sample chooses an India parser with confidence >= 0.8.
- [ ] Test unrelated malformed file returns no high-confidence parser.
- [ ] Test parser output includes `externalFingerprint` for dedupe.
- [ ] Port generic CSV/PDF/Excel parsing from `perfin/packages/extractors`.
- [ ] Port at least one India bank parser from `perfin-in/packages/parsers-in` for P0.
- [ ] Implement dispatcher that ranks parsers and returns warnings.
- [ ] Run `pnpm --filter @fintivi/parsers test`.

### Task 6: Upload jobs and SSE

**Files:**

- Create: `apps/api/src/routes/uploads.ts`
- Create: `apps/api/src/lib/jobs.ts`
- Create: `apps/api/src/lib/sse.ts`
- Create: `apps/api/tests/uploads.test.ts`

**Produces:** DB-backed upload flow with replayable progress.

- [ ] Test `POST /uploads` rejects unauthenticated requests.
- [ ] Test unsupported file type returns `VALIDATION_ERROR`.
- [ ] Test valid upload creates `upload_jobs` row with `queued` status.
- [ ] Test SSE stream first emits latest persisted state.
- [ ] Test User A cannot stream User B upload job.
- [ ] Test preview shows parser candidates and warnings.
- [ ] Test confirm imports rows idempotently and reports imported/skipped/duplicates.
- [ ] Implement upload validation and parser dispatch.
- [ ] Implement DB-backed job state transitions.
- [ ] Implement SSE from persisted job events.
- [ ] Run `pnpm --filter @fintivi/api test uploads`.

### Task 7: Accounts, transactions, and categories

**Files:**

- Create: `apps/api/src/routes/accounts.ts`
- Create: `apps/api/src/routes/transactions.ts`
- Create: `apps/api/src/routes/categories.ts`
- Create: `packages/core/src/transactions/*`
- Create: `packages/core/src/categories/*`
- Create: `apps/api/tests/transactions.test.ts`
- Create: `apps/api/tests/categories.test.ts`

**Produces:** editable ledger API.

- [ ] Test account CRUD with ownership checks.
- [ ] Test transaction list pagination, account filter, date filter, category filter, and search.
- [ ] Test transaction update can change category and notes only for owner.
- [ ] Test transaction split validates split sum equals original amount.
- [ ] Test category rules create/update/delete with ownership checks.
- [ ] Implement account routes.
- [ ] Implement transaction routes.
- [ ] Implement category and rule routes.
- [ ] Run `pnpm --filter @fintivi/api test transactions categories`.

### Task 8: Dashboard endpoint

**Files:**

- Create: `apps/api/src/routes/dashboard.ts`
- Create: `packages/core/src/dashboard/summary.ts`
- Create: `apps/api/tests/dashboard.test.ts`

**Produces:** frontend-ready dashboard contract.

- [ ] Test empty dashboard for new user returns zero totals and empty arrays.
- [ ] Test dashboard after upload returns income, expenses, net, recent transactions, category breakdown, and data health.
- [ ] Test dashboard respects user currency and date range.
- [ ] Test User A cannot see User B dashboard data.
- [ ] Implement dashboard query in `packages/core`.
- [ ] Register `/dashboard` route.
- [ ] Run `pnpm --filter @fintivi/api test dashboard`.

### Task 9: End-to-end P0 verification

**Files:**

- Create: `apps/api/tests/p0-flow.test.ts`
- Create: `docs/API.md`
- Create: `docs/SECURITY.md`

**Produces:** one executable proof that P0 works.

- [ ] Test email signup -> create account -> upload global sample -> preview -> confirm -> list transactions -> dashboard.
- [ ] Test phone OTP signup -> create account -> upload India sample -> preview -> confirm -> list transactions -> dashboard.
- [ ] Test Google OAuth callback with mocked provider -> `/users/me`.
- [ ] Test rate limit behavior for OTP request and login.
- [ ] Document P0 API in `docs/API.md` with request/response examples.
- [ ] Document auth, upload, ownership, rate-limit, and data-retention controls in `docs/SECURITY.md`.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm lint`.

## 13. P1 Design Notes

### Provider-neutral billing

Do not port Stripe/Razorpay into P0. When billing starts, design these tables first:

```text
billing_customers(provider, external_customer_id, user_id)
subscriptions(provider, external_subscription_id, user_id, status, currency, country)
billing_events(provider, event_id, processed_at)
entitlements(user_id, plan_key, source, expires_at)
```

Provider rule for P1:

- India paid launch: Razorpay first.
- Global paid launch: Stripe first.
- Both providers only after provider-neutral webhook idempotency is tested.

### Agent write proposals

When the agent is added, it must only create immutable proposals. Confirm must be idempotent, transactional, ownership-checked, expiry-checked, and audited.

### Frontend plan

Create a separate `FRONTEND_PLAN.md` after P0 API stabilizes. It must define route inventory, navigation, screen states, responsive behavior, accessibility, design tokens, and component acceptance criteria.

Minimum frontend routes expected from P0:

```text
/signup
/login
/onboarding
/uploads
/transactions
/dashboard
/settings/profile
```

## 14. Acceptance Criteria

P0 is complete only when all of these are true:

- `pnpm test` passes.
- `pnpm typecheck` passes.
- `pnpm lint` passes.
- A fresh developer can run `pnpm install`, `docker compose up -d`, `pnpm db:migrate`, and `pnpm dev`.
- Email/password signup works.
- Phone OTP signup works with the configured dev OTP provider.
- Google OAuth callback works with mocked integration tests.
- A global sample upload imports transactions and appears in `/dashboard`.
- An India sample upload imports transactions and appears in `/dashboard`.
- Cross-user access tests pass for accounts, uploads, streams, transactions, categories, and dashboard.
- OTP, login, upload, and refresh rate-limit tests pass.
- Uploaded file validation tests pass.
- Raw sensitive values are absent from logs in test assertions.
- `docs/API.md` and `docs/SECURITY.md` match the implemented routes.

## 15. Implementation Order

1. Scaffold monorepo and API health.
2. Build fresh UUID database schema.
3. Build auth package.
4. Register auth routes and ownership middleware.
5. Build parser package with one global and one India fixture.
6. Build upload jobs and SSE.
7. Build account, transaction, and category routes.
8. Build dashboard endpoint.
9. Run P0 end-to-end verification and documentation.

Do not start P1 integrations until P0 acceptance criteria pass.
