# Frontend P0 App Shell Design

Date: 2026-07-05
Status: Approved design, pending implementation plan

## Context

Fintivi currently has a verified Fastify API in `apps/api` and shared packages for auth, core finance services, database schema, and parsers. There is no frontend app yet. The API exposes the P0 product surface needed for a browser app: email auth, OTP auth, Google OAuth, dashboard summary, accounts, uploads with SSE progress, transaction management, categories, and user profile settings.

The first frontend milestone should create a Vite React TypeScript SPA in `apps/web`. The app should feel like a calm daily finance home, with statement import as the primary workflow.

## Goals

- Add `apps/web` as a Vite React TypeScript app inside the existing pnpm/turbo workspace.
- Support email signup/login, OTP login, and Google sign-in.
- Provide a protected dashboard as the signed-in home base.
- Let users create and manage accounts enough to import transactions.
- Let users upload a statement, watch progress, preview parsed transactions, choose an account, and confirm import.
- Let users view and manage imported transactions with basic filters, category/notes edit, delete, and split.
- Provide profile/settings basics: display name, locale, currency, and logout.
- Make small API polish changes only where browser flows require them.
- Include frontend tests for the app shell, auth flows, upload states, and key error paths.

## Non-Goals

- Budgeting, forecasting, or advanced analytics.
- Bank connections or background sync.
- Category rule management UI unless transaction editing exposes a hard dependency.
- Extracting a reusable design-system package.
- Native mobile app behavior beyond responsive web layouts.
- Reworking the backend architecture beyond small browser integration fixes.

## Architecture

Create `apps/web` with this structure:

```text
apps/web/
  src/
    api/
      client.ts
      auth.ts
      dashboard.ts
      accounts.ts
      uploads.ts
      transactions.ts
      users.ts
    auth/
      auth-store.tsx
      protected-route.tsx
      token-storage.ts
    routes/
      auth/
      dashboard/
      accounts/
      uploads/
      transactions/
      settings/
    components/
    lib/
      format.ts
      errors.ts
      market.ts
```

Keep boundaries simple:

- `api/` owns HTTP details, response parsing, token attachment, refresh retry, and typed endpoint functions.
- `auth/` owns signed-in state, token storage, protected route gating, and logout.
- `routes/` owns page-level data loading and user flows.
- `components/` starts small and only contains reused visual pieces.
- `lib/` contains pure formatting and mapping helpers.

Use a single API base URL from frontend env, defaulting locally to `http://localhost:8001/api/v1`.

## Product Flow

The app has two top-level modes: signed out and signed in.

Signed out:

- One auth surface supports email login, email signup, OTP login, and Google sign-in.
- Market selection appears where it affects new users: signup and OTP verify.
- Google sign-in starts by navigating to the API OAuth start endpoint.
- Auth errors are shown inline and never expose raw backend details.

Signed in:

- Dashboard is the home route.
- Primary dashboard action is `Import statement`.
- Accounts, transactions, and settings support the dashboard/import loop.

Primary upload flow:

1. User selects a supported file.
2. UI submits `POST /uploads`.
3. UI opens the SSE stream for the returned job id.
4. UI shows queued, validating, parsing, preview-ready, failed, importing, and completed states.
5. When preview is ready, UI fetches `/uploads/:jobId/preview`.
6. User reviews transactions and warnings.
7. User selects an account.
8. User confirms import.
9. UI shows imported, skipped, and duplicate counts, then refreshes dashboard and transactions.

## Routes

- `/login`: email login, OTP login, and Google sign-in entry point.
- `/signup`: email signup with market, locale, and currency defaults.
- `/auth/google/callback`: SPA callback/result page for Google auth.
- `/dashboard`: cashflow, account balances, data health, and recent transactions.
- `/accounts`: list, create, edit, and deactivate accounts.
- `/uploads/new`: statement upload and progress.
- `/uploads/:jobId/preview`: parsed transaction preview and confirm import.
- `/transactions`: transaction list with filters and row actions.
- `/transactions/:id/split`: split transaction workflow.
- `/settings`: profile settings and logout.

## Visual Direction

Use a light-first visual system optimized for trust and scanning:

- Deep ink text, warm off-white backgrounds, white cards, and restrained green/amber accents.
- High contrast for balances and transaction amounts.
- Compact cards for accounts and data-health signals.
- Tables on desktop for financial scanning.
- Stacked cards on mobile for transaction rows and upload previews.
- Clear empty states that tell users what to do next.

The dashboard hierarchy should make net cashflow, data freshness, and the next import action immediately visible. The upload flow should make it clear when nothing has been imported yet, when parsing has warnings, and what happened after confirmation.

## Data Flow

All API calls go through `apiClient`:

- Attach access token to protected calls.
- Parse success responses as `{ data }`.
- Parse API failures as `{ error: { code, message } }`.
- Map known API error codes to user-facing messages.
- On `401`, attempt one refresh using the stored refresh token.
- If refresh fails, clear auth state and redirect to login.

Token policy:

- Keep the access token in React auth state.
- Persist the refresh token and minimal user/session state so reloads can restore the session.
- Do not log tokens or show them in UI.

Dashboard data loads from `GET /dashboard` and can be refreshed after uploads or account changes. Transactions, accounts, and settings use their route-specific API functions.

Upload data flow:

- Submit multipart form data to `POST /uploads`.
- Subscribe to `GET /uploads/:jobId/stream` for replayed and live events.
- Fetch preview after `preview_ready`.
- Confirm import with `POST /uploads/:jobId/confirm`.
- Refresh dashboard, transactions, and account state after confirmation.

## API Polish Needed

Keep API changes small and browser-driven:

- Add frontend origin support through explicit local CORS configuration if needed for `http://localhost:5173`.
- Adjust Google OAuth callback behavior so browser users return to the SPA instead of landing on raw JSON. For P0, redirect to `${WEB_APP_URL}/auth/google/callback` with `accessToken`, `refreshToken`, `sessionId`, and basic user fields in the URL fragment, not the query string. The SPA must store the tokens and immediately call `history.replaceState` to remove the fragment from the visible URL. A later hardening pass can replace this with a one-time code exchange.
- Expose any missing config in `.env.example`, such as web origin or callback URL.

Do not change finance route contracts unless implementation finds a hard mismatch.

## Error Handling

Use clear recovery language by failure class:

- Validation: show inline field or file errors.
- Auth expiry: redirect to login after one failed refresh attempt.
- Rate limits: explain the limit and when to retry.
- Upload failures: show the failed stage, backend message, and retry option.
- Not found: show a generic unavailable message without implying ownership details.
- Network failure: show a retry action and keep existing page data if available.

## Testing

Use Vitest and React Testing Library for the first milestone.

Cover:

- Auth state restoration, login/signup success, failed login, OTP request/verify, and logout.
- Protected-route redirect behavior.
- API client parsing, refresh retry, and refresh failure logout.
- Dashboard loading, empty state, and populated state.
- Upload success, preview-ready, failed upload, warning display, and confirm import result.
- Transaction list filtering and basic row actions.
- Responsive rendering for the dashboard and transaction list at a component level where practical.

Browser E2E with Playwright is valuable after the first app shell exists. It can be added in the implementation plan if time allows, but it is not required to define the first app boundary.

## Acceptance Criteria

- `pnpm dev` starts both API and web app through turbo.
- `apps/web` can authenticate with email/password, OTP, and Google flow support.
- Protected routes redirect signed-out users to login.
- Dashboard renders real API data for an authenticated user.
- User can create an account, upload a supported CSV, review preview, confirm import, and see the dashboard update.
- User can list and edit transactions, including category/notes changes, delete, and split.
- Settings can update supported profile fields and logout.
- Frontend tests pass with mocked API responses.
- Root `pnpm test`, `pnpm typecheck`, and `pnpm lint` include the web app and complete with zero errors. Existing warning-only lint output is acceptable if unchanged or explicitly documented.
- Documentation explains how to run the web app and any required env vars.

## Implementation Sequence Preview

The implementation plan should split work into small vertical slices:

1. Scaffold `apps/web`, workspace scripts, lint/typecheck/test setup, and basic shell.
2. Build API client, auth store, token refresh, and protected routing.
3. Build email, OTP, and Google auth screens plus required API polish.
4. Build dashboard with mocked then real API data.
5. Build accounts management needed for imports.
6. Build upload/progress/preview/confirm flow.
7. Build transaction list and basic row actions.
8. Build settings/profile/logout.
9. Add integration polish, docs, and full verification.
