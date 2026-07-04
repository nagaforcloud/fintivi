# Fintivi API Documentation

## Base URL

```
http://localhost:8001/api/v1
```

## Authentication

Most endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

Access tokens are valid for 15 minutes. Use `POST /auth/refresh` to obtain a new token pair.

---

## Health

### GET /api/v1/health

Public. Returns service health.

**Response 200:**

```json
{
  "data": { "ok": true }
}
```

---

## Auth

### POST /api/v1/auth/signup

Public. Creates a new user with email/password.

Rate limit: 10 requests per 15 minutes.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass1!",
  "market": "global",
  "locale": "en",
  "currency": "USD"
}
```

- `market`: `"global"` or `"india"`
- `locale`: language code (e.g. `"en"`, `"hi"`)
- `currency`: ISO 4217 currency (e.g. `"USD"`, `"INR"`)

**Response 201:**

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "market": "global",
      "locale": "en",
      "currency": "USD"
    },
    "accessToken": "eyJhbG...",
    "refreshToken": "r_abc123...",
    "sessionId": "uuid"
  }
}
```

**Errors:** `400 VALIDATION_ERROR`

---

### POST /api/v1/auth/login

Public. Authenticates with email/password.

Rate limit: 10 requests per 15 minutes.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass1!"
}
```

**Response 200:**

```json
{
  "data": {
    "user": { "id": "uuid", "email": "user@example.com", "market": "global", "locale": "en", "currency": "USD" },
    "accessToken": "eyJhbG...",
    "refreshToken": "r_abc123...",
    "sessionId": "uuid"
  }
}
```

**Errors:** `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`

---

### POST /api/v1/auth/otp/request

Public. Requests an OTP code for phone-based authentication.

Rate limit: 3 requests per 15 minutes (internal rate limiter).

**Request:**

```json
{
  "phone": "+15551234567"
}
```

**Response 200:**

```json
{
  "data": {
    "expiresAt": "2026-07-04T12:00:00.000Z",
    "code": "123456"
  }
}
```

> The `code` field is only returned in test/development mode with the `test` OTP provider.

**Errors:** `400 VALIDATION_ERROR`, `429 RATE_LIMITED`

---

### POST /api/v1/auth/otp/verify

Public. Verifies an OTP code and returns tokens.

Rate limit: 10 requests per 15 minutes.

**Request:**

```json
{
  "phone": "+15551234567",
  "code": "123456"
}
```

**Response 200:**

```json
{
  "data": {
    "userId": "uuid",
    "accessToken": "eyJhbG...",
    "refreshToken": "r_abc123...",
    "sessionId": "uuid"
  }
}
```

**Errors:** `400 VALIDATION_ERROR`, `401 INVALID_OTP`

---

### GET /api/v1/auth/google/start

Public. Redirects to Google's OAuth consent screen.

**Response:** `302 Redirect` to `https://accounts.google.com/o/oauth2/v2/auth?...`

---

### GET /api/v1/auth/google/callback

Public. Handles the Google OAuth callback, exchanges the code for tokens, and returns session tokens.

**Query params:** `?code=<authorization_code>`

**Response 200:**

```json
{
  "data": {
    "user": { "id": "uuid", "email": "google-user@gmail.com", "market": "global" },
    "accessToken": "eyJhbG...",
    "refreshToken": "r_abc123...",
    "sessionId": "uuid"
  }
}
```

**Errors:** `400 VALIDATION_ERROR`, `401 GOOGLE_AUTH_FAILED`

---

### POST /api/v1/auth/refresh

Public. Rotates a refresh token and returns a new token pair.

**Request:**

```json
{
  "refreshToken": "r_abc123..."
}
```

**Response 200:**

```json
{
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "r_def456...",
    "sessionId": "uuid"
  }
}
```

**Errors:** `400 VALIDATION_ERROR`, `401 TOKEN_REUSED` / `TOKEN_EXPIRED`

---

### POST /api/v1/auth/logout

Authenticated. Revokes the current session.

**Request:**

```json
{
  "refreshToken": "r_abc123..."
}
```

**Response 200:**

```json
{
  "data": { "ok": true }
}
```

---

## Users

### GET /api/v1/users/me

Authenticated. Returns the current user's profile.

**Response 200:**

```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "phoneE164": null,
    "displayName": null,
    "market": "global",
    "locale": "en",
    "currency": "USD",
    "createdAt": "2026-07-04T10:00:00.000Z",
    "updatedAt": "2026-07-04T10:00:00.000Z"
  }
}
```

**Errors:** `401 UNAUTHORIZED`

---

### PATCH /api/v1/users/me

Authenticated. Updates the current user's profile.

**Request:**

```json
{
  "displayName": "John Doe",
  "locale": "en",
  "currency": "EUR"
}
```

All fields are optional. At least one is required.

**Response 200:**

```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "market": "global",
    "locale": "en",
    "currency": "EUR",
    "createdAt": "2026-07-04T10:00:00.000Z",
    "updatedAt": "2026-07-04T10:00:00.000Z"
  }
}
```

**Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`

---

## Accounts

All authenticated. All resources are scoped to the authenticated user.

### GET /api/v1/accounts

Lists all accounts for the authenticated user.

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "name": "Checking Account",
      "type": "checking",
      "bank": "My Bank",
      "currency": "USD",
      "balanceMinor": 50000,
      "isActive": true,
      "createdAt": "2026-07-04T10:00:00.000Z",
      "updatedAt": "2026-07-04T10:00:00.000Z"
    }
  ]
}
```

---

### POST /api/v1/accounts

Creates a new account.

**Request:**

```json
{
  "name": "Savings Account",
  "type": "savings",
  "bank": "My Bank",
  "currency": "EUR",
  "balanceMinor": 100000
}
```

- `name` (required)
- `type`: defaults to `"checking"`
- `bank`: defaults to `""`
- `currency`: defaults to `"USD"`
- `balanceMinor`: defaults to `0`

**Response 201:** The created account object.

**Errors:** `400 VALIDATION_ERROR`

---

### PATCH /api/v1/accounts/:id

Updates an account. Ownership-checked.

**Request:**

```json
{
  "name": "Updated Name",
  "type": "checking",
  "bank": "New Bank",
  "currency": "GBP",
  "balanceMinor": 75000,
  "isActive": false
}
```

All fields optional.

**Response 200:** The updated account object.

**Errors:** `400 VALIDATION_ERROR`, `404 NOT_FOUND`

---

### DELETE /api/v1/accounts/:id

Deletes an account. Ownership-checked.

**Response 200:**

```json
{
  "data": { "ok": true }
}
```

**Errors:** `404 NOT_FOUND`

---

## Uploads

All authenticated. All upload jobs are scoped to the authenticated user.

### POST /api/v1/uploads

Uploads a financial file for parsing. Rate limit: 20 uploads per day per user.

**Request:** `multipart/form-data` with a `file` field.

- Allowed extensions: `.csv`, `.pdf`, `.xls`, `.xlsx`
- Max file size: 20 MB
- Supported formats: generic CSV (global), HDFC CSV (India)

**Response 201:**

```json
{
  "data": { "jobId": "uuid" }
}
```

The upload is processed synchronously before the response:

1. `queued` -> `validating` -> `parsing` -> `preview_ready` (success)
2. `queued` -> `failed` (error)

**Errors:** `400 VALIDATION_ERROR`, `429 RATE_LIMITED`, `401 UNAUTHORIZED`

---

### GET /api/v1/uploads/:jobId

Returns the upload job status. Ownership-checked.

**Response 200:**

```json
{
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "fileName": "statement.csv",
    "fileSize": 1024,
    "mime": "text/csv",
    "status": "preview_ready",
    "error": null,
    "metadata": { "transactions": [...], "candidates": [...], "warnings": [] },
    "createdAt": "2026-07-04T10:00:00.000Z",
    "updatedAt": "2026-07-04T10:00:00.000Z"
  }
}
```

**Errors:** `404 NOT_FOUND`

---

### GET /api/v1/uploads/:jobId/stream

SSE stream for real-time upload progress. Ownership-checked. Max 5 concurrent streams per user.

**Response 200:** `text/event-stream`

```
event: progress
data: {"stage":"queued","percent":0,"message":"Upload received"}

event: progress
data: {"stage":"validating","percent":20,"message":"Validating file..."}

event: progress
data: {"stage":"parsing","percent":50,"message":"Parsing transactions..."}

event: progress
data: {"stage":"preview_ready","percent":100,"message":"Preview ready: 5 transactions found"}

event: complete
data: {"status":"preview_ready"}
```

**Errors:** `404 NOT_FOUND`, `429 RATE_LIMITED`

---

### GET /api/v1/uploads/:jobId/preview

Returns parsed transaction preview and parser candidates. Ownership-checked. Requires `preview_ready` status.

**Response 200:**

```json
{
  "data": {
    "candidates": [
      { "id": "generic-csv", "label": "Generic CSV", "confidence": 1.0 }
    ],
    "transactions": [
      {
        "postedAt": "2026-01-15",
        "description": "Amazon Purchase",
        "amountMinor": -2999,
        "currency": "USD",
        "externalFingerprint": "hash"
      }
    ],
    "warnings": []
  }
}
```

**Errors:** `400 INVALID_STATE`, `404 NOT_FOUND`

---

### POST /api/v1/uploads/:jobId/confirm

Confirms an upload and imports transactions into the user's account. Idempotent — a second call returns `400 INVALID_STATE`. Ownership-checked. Requires `preview_ready` status.

**Request:**

```json
{
  "accountId": "uuid"
}
```

**Response 200:**

```json
{
  "data": {
    "imported": 5,
    "skipped": 0,
    "duplicates": 0
  }
}
```

**Errors:** `400 VALIDATION_ERROR`, `400 INVALID_STATE`, `404 NOT_FOUND`

---

## Transactions

All authenticated. All transactions are scoped to the authenticated user.

### GET /api/v1/transactions

Paginated list of transactions with optional filters.

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `perPage` | integer | Items per page (default: 20) |
| `accountId` | string | Filter by account |
| `categoryId` | string | Filter by category |
| `dateFrom` | string | Start date (ISO 8601) |
| `dateTo` | string | End date (ISO 8601) |
| `search` | string | Full-text search on description |

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "accountId": "uuid",
      "postedAt": "2026-01-15T00:00:00.000Z",
      "description": "Amazon Purchase",
      "amountMinor": -2999,
      "currency": "USD",
      "categoryId": null,
      "notes": null,
      "externalFingerprint": null,
      "createdAt": "2026-07-04T10:00:00.000Z",
      "updatedAt": "2026-07-04T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 42
  }
}
```

---

### GET /api/v1/transactions/:id

Returns a single transaction. Ownership-checked.

**Response 200:** The transaction object.

**Errors:** `404 NOT_FOUND`

---

### PATCH /api/v1/transactions/:id

Updates a transaction's category and notes. Ownership-checked.

**Request:**

```json
{
  "categoryId": "uuid",
  "notes": "Business expense"
}
```

Both fields optional.

**Response 200:** The updated transaction object.

**Errors:** `404 NOT_FOUND`

---

### POST /api/v1/transactions/:id/split

Splits a transaction into multiple child transactions. Ownership-checked. Requires exactly matching total.

**Request:**

```json
{
  "splits": [
    { "amountMinor": 1500, "description": "Part 1", "categoryId": null },
    { "amountMinor": 1500, "description": "Part 2", "categoryId": null }
  ]
}
```

- At least 2 splits required
- Sum of `amountMinor` must equal the original transaction's `amountMinor`
- Original transaction is deleted and replaced with split rows

**Response 201:**

```json
{
  "data": [
    { "id": "uuid", "accountId": "uuid", "amountMinor": 1500, "description": "Part 1", "parentId": "uuid" },
    { "id": "uuid", "accountId": "uuid", "amountMinor": 1500, "description": "Part 2", "parentId": "uuid" }
  ]
}
```

**Errors:** `400 VALIDATION_ERROR`, `404 NOT_FOUND`

---

### DELETE /api/v1/transactions/:id

Deletes a transaction. Ownership-checked.

**Response 200:**

```json
{
  "data": { "ok": true }
}
```

**Errors:** `404 NOT_FOUND`

---

## Categories

All authenticated.

### GET /api/v1/categories

Returns system categories (shared by all users) plus user-created categories.

**Response 200:**

```json
{
  "data": [
    { "id": "uuid", "name": "Salary", "type": "income", "color": "#00ff00", "icon": "💰", "isSystem": true, "userId": null },
    { "id": "uuid", "name": "Freelance", "type": "income", "color": "#0000ff", "icon": "💻", "isSystem": false, "userId": "uuid" }
  ]
}
```

---

### POST /api/v1/categories/rules

Creates a category auto-assignment rule.

**Request:**

```json
{
  "categoryId": "uuid",
  "pattern": "salary",
  "matchType": "contains",
  "priority": 1
}
```

- `matchType`: `"contains"`, `"regex"`, or `"exact"`

**Response 201:**

```json
{
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "categoryId": "uuid",
    "pattern": "salary",
    "matchType": "contains",
    "priority": 1,
    "createdAt": "2026-07-04T10:00:00.000Z",
    "updatedAt": "2026-07-04T10:00:00.000Z"
  }
}
```

**Errors:** `400 VALIDATION_ERROR`

---

### PATCH /api/v1/categories/rules/:id

Updates a category rule. Ownership-checked.

**Request:**

```json
{
  "categoryId": "uuid",
  "pattern": "new-pattern",
  "matchType": "exact",
  "priority": 5
}
```

**Response 200:** The updated rule object.

**Errors:** `404 NOT_FOUND`

---

### DELETE /api/v1/categories/rules/:id

Deletes a category rule. Ownership-checked.

**Response 200:**

```json
{
  "data": { "ok": true }
}
```

**Errors:** `404 NOT_FOUND`

---

## Dashboard

### GET /api/v1/dashboard

Authenticated. Returns a financial summary for the authenticated user.

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `from` | string | Start date (ISO 8601) |
| `to` | string | End date (ISO 8601) |

**Response 200:**

```json
{
  "data": {
    "range": { "from": "2026-06-01T00:00:00.000Z", "to": "2026-06-30T00:00:00.000Z" },
    "currency": "USD",
    "cashflow": {
      "incomeMinor": 500000,
      "expenseMinor": 40000,
      "netMinor": 460000
    },
    "accounts": [
      { "id": "uuid", "name": "Checking Account", "balanceMinor": 50000, "currency": "USD" }
    ],
    "recentTransactions": [
      {
        "id": "uuid",
        "postedAt": "2026-06-17",
        "description": "Restaurant",
        "amountMinor": -15000,
        "currency": "USD",
        "accountName": "Checking Account",
        "categoryName": "Food"
      }
    ],
    "categoryBreakdown": [
      { "categoryName": "Salary", "type": "income", "amountMinor": 500000 },
      { "categoryName": "Food", "type": "expense", "amountMinor": 40000 }
    ],
    "dataHealth": {
      "lastUploadAt": "2026-07-04T10:00:00.000Z",
      "pendingReviewCount": 1,
      "failedUploadCount": 0
    }
  }
}
```

**Errors:** `401 UNAUTHORIZED`

---

## Error Response Format

All errors follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

Standard error codes:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request body or params |
| `INVALID_STATE` | 400 | Operation not allowed in current state |
| `UNAUTHORIZED` | 401 | Missing or invalid access token |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `INVALID_OTP` | 401 | Wrong or expired OTP code |
| `TOKEN_REUSED` | 401 | Refresh token already used |
| `TOKEN_EXPIRED` | 401 | Refresh token expired |
| `GOOGLE_AUTH_FAILED` | 401 | Google OAuth failure |
| `NOT_FOUND` | 404 | Resource not found or no access |
| `RATE_LIMITED` | 429 | Too many requests |

> `404 NOT_FOUND` is deliberately used instead of `403 FORBIDDEN` to avoid leaking resource existence to unauthorized users (the `requireOwner` middleware returns 404).
