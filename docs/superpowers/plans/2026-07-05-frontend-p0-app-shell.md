# Frontend P0 App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first Fintivi web app: a Vite React P0 shell with auth, dashboard, accounts, upload/import, transactions, settings, and small browser-integration API polish.

**Architecture:** Add `apps/web` as a TypeScript React SPA in the existing pnpm/turbo workspace. Keep HTTP, auth state, route pages, and formatting helpers in separate focused modules. Use the existing Fastify API contracts and only change API behavior where browser auth/CORS requires it.

**Tech Stack:** Vite, React, TypeScript, React Router, Vitest, React Testing Library, jsdom, Fastify, pnpm workspaces, Turborepo.

## Global Constraints

- API base URL defaults locally to `http://localhost:8001/api/v1`.
- Web dev server should run on Vite's default `http://localhost:5173` unless explicitly changed.
- Access tokens stay in React auth state as the source of truth. For P0, token storage may mirror the full `AuthSession` so default API wrappers can attach tokens after reload; clear storage immediately on logout or auth expiry.
- Google OAuth P0 callback redirects to `${WEB_APP_URL}/auth/google/callback` with tokens in the URL fragment, and the SPA immediately removes the fragment with `history.replaceState`.
- All API responses use either `{ data }` or `{ error: { code, message } }`.
- Keep API changes limited to browser integration: local CORS configuration, Google OAuth redirect, and env/docs wiring.
- Use TDD for behavior changes: write failing tests, run them, then implement.
- Commit steps in this plan must only be run if the user has explicitly authorized commits in the implementation session.
- Do not restore or keep generated cache artifacts such as `.turbo/*` or `node_modules/.vite/*` in the final diff.

---

## File Structure

Create or modify these files.

### Workspace And Tooling

- Create `apps/web/package.json`: web app scripts and dependencies.
- Create `apps/web/index.html`: Vite HTML entry.
- Create `apps/web/vite.config.ts`: React plugin, Vitest/jsdom config.
- Create `apps/web/tsconfig.json`: extends shared TS base and enables React JSX.
- Create `apps/web/eslint.config.js`: extends shared ESLint base and ignores test files if needed.
- Modify `package.json`: keep root scripts working through turbo; no special web-only root script required unless implementation chooses one.
- Modify `turbo.json`: add web env vars to `globalEnv`.
- Modify `.env.example`: add browser/API integration env vars.

### Web App Core

- Create `apps/web/src/main.tsx`: React root mount.
- Create `apps/web/src/app.tsx`: route tree and app shell.
- Create `apps/web/src/styles.css`: global visual system and responsive primitives.
- Create `apps/web/src/vite-env.d.ts`: Vite env typings.
- Create `apps/web/src/test/setup.ts`: test setup for jsdom.

### API Client

- Create `apps/web/src/api/types.ts`: shared response, error, user, account, transaction, dashboard, upload types.
- Create `apps/web/src/api/client.ts`: `ApiClient`, token getter hooks, refresh-once behavior, error parsing, and default token storage bridge.
- Create `apps/web/src/api/auth.ts`: auth endpoint wrappers.
- Create `apps/web/src/api/dashboard.ts`: dashboard endpoint wrapper.
- Create `apps/web/src/api/accounts.ts`: account endpoint wrappers.
- Create `apps/web/src/api/uploads.ts`: upload, preview, confirm, and SSE helpers.
- Create `apps/web/src/api/transactions.ts`: transaction endpoint wrappers.
- Create `apps/web/src/api/users.ts`: profile endpoint wrappers.

### Auth

- Create `apps/web/src/auth/token-storage.ts`: localStorage serialization for refresh token/session/user.
- Create `apps/web/src/auth/auth-store.tsx`: React auth context/provider and actions.
- Create `apps/web/src/auth/protected-route.tsx`: redirect signed-out users to `/login`.
- Create `apps/web/src/routes/auth/login-page.tsx`: email login, OTP login, Google entry.
- Create `apps/web/src/routes/auth/signup-page.tsx`: email signup.
- Create `apps/web/src/routes/auth/google-callback-page.tsx`: parse URL fragment, store auth, remove fragment.

### Signed-In Routes

- Create `apps/web/src/routes/dashboard/dashboard-page.tsx`: dashboard cards and recent activity.
- Create `apps/web/src/routes/accounts/accounts-page.tsx`: list/create/edit/deactivate accounts.
- Create `apps/web/src/routes/uploads/upload-page.tsx`: upload file and progress states.
- Create `apps/web/src/routes/uploads/upload-preview-page.tsx`: preview table, account selection, confirm import.
- Create `apps/web/src/routes/transactions/transactions-page.tsx`: list/filter/edit/delete.
- Create `apps/web/src/routes/transactions/split-transaction-page.tsx`: split flow.
- Create `apps/web/src/routes/settings/settings-page.tsx`: profile update and logout.

### Shared UI And Helpers

- Create `apps/web/src/components/app-layout.tsx`: signed-in nav/layout.
- Create `apps/web/src/components/form-field.tsx`: accessible label/input/error wrapper.
- Create `apps/web/src/components/status-message.tsx`: error/success/warning callouts.
- Create `apps/web/src/components/metric-card.tsx`: dashboard metric card.
- Create `apps/web/src/components/data-table.tsx`: simple responsive table wrapper.
- Create `apps/web/src/lib/format.ts`: money/date formatting.
- Create `apps/web/src/lib/errors.ts`: API error-code to UI-message mapping.
- Create `apps/web/src/lib/market.ts`: market/currency defaults.

### API Browser Polish

- Modify `apps/api/src/env.ts`: add `WEB_APP_URL` and `CORS_ORIGIN` defaults.
- Modify `apps/api/src/server.ts`: register CORS with explicit origin list.
- Modify `apps/api/src/routes/auth.ts`: redirect Google callback to web app URL fragment on success/failure.
- Modify `apps/api/tests/google-auth.test.ts`: cover redirect fragment and unverified email failure behavior.
- Modify `apps/api/tests/env.test.ts`: cover new env defaults and production parsing.
- Modify `turbo.json`: add `WEB_APP_URL`, `CORS_ORIGIN`, and `VITE_API_BASE_URL` to `globalEnv`.

### Docs

- Create `README.md`: local setup, env, dev commands, and P0 flow.
- Modify `docs/API.md`: document Google web callback behavior and web origin env.

---

## Shared Interfaces To Use Across Tasks

These names should stay stable so tasks can be implemented independently.

```ts
// apps/web/src/api/types.ts
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_STATE'
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_OTP'
  | 'TOKEN_REUSED'
  | 'TOKEN_EXPIRED'
  | 'GOOGLE_AUTH_FAILED'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'NETWORK_ERROR'

export interface ApiError {
  code: ApiErrorCode
  message: string
}

export interface UserProfile {
  id: string
  email: string | null
  phoneE164?: string | null
  displayName?: string | null
  market: 'global' | 'india'
  locale: string
  currency: string
}

export interface AuthSession {
  user: UserProfile
  accessToken: string
  refreshToken: string
  sessionId: string
}

export interface Account {
  id: string
  userId: string
  name: string
  type: string
  bank: string
  currency: string
  balanceMinor: number
  isActive: boolean
}

export interface Transaction {
  id: string
  userId: string
  accountId: string
  postedAt: string
  description: string
  amountMinor: number
  currency: string
  categoryId: string | null
  notes: string | null
  externalFingerprint: string | null
}

export interface DashboardSummary {
  range: { from: string; to: string }
  currency: string
  cashflow: { incomeMinor: number; expenseMinor: number; netMinor: number }
  accounts: Array<{ id: string; name: string; balanceMinor: number; currency: string }>
  recentTransactions: Array<{
    id: string
    postedAt: string
    description: string
    amountMinor: number
    currency: string
    accountName: string
    categoryName: string | null
  }>
  categoryBreakdown: Array<{ categoryName: string; type: string; amountMinor: number }>
  dataHealth: { lastUploadAt: string | null; pendingReviewCount: number; failedUploadCount: number }
}

export interface UploadPreviewTransaction {
  postedAt: string
  description: string
  amountMinor: number
  currency: string
  externalFingerprint: string
}

export interface UploadPreview {
  candidates: Array<{ id?: string; label?: string; confidence?: number }>
  transactions: UploadPreviewTransaction[]
  warnings: string[]
}

export interface UploadProgressEvent {
  stage: string
  percent: number
  message: string
}
```

---

### Task 1: Scaffold `apps/web` And Shared UI Foundations

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/index.html`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/eslint.config.js`
- Create: `apps/web/src/vite-env.d.ts`
- Create: `apps/web/src/test/setup.ts`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/app.tsx`
- Create: `apps/web/src/styles.css`
- Create: `apps/web/src/components/status-message.tsx`
- Create: `apps/web/src/components/form-field.tsx`
- Create: `apps/web/src/components/metric-card.tsx`
- Create: `apps/web/src/components/data-table.tsx`
- Create: `apps/web/src/lib/format.ts`

**Interfaces:**
- Consumes: Existing pnpm workspace pattern from `pnpm-workspace.yaml`, shared config from `@fintivi/config`.
- Produces: A compilable Vite React app, base layout primitives, and formatting helpers used by later route tasks.

- [ ] **Step 1: Add package manifest**

Create `apps/web/package.json`:

```json
{
  "name": "@fintivi/web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "vite": "latest",
    "react": "latest",
    "react-dom": "latest",
    "react-router-dom": "latest"
  },
  "devDependencies": {
    "@fintivi/config": "workspace:*",
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@testing-library/user-event": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "eslint": "^10.6.0",
    "jsdom": "latest",
    "typescript": "5.6.3",
    "vitest": "2.1.4"
  }
}
```

- [ ] **Step 2: Add Vite and TS config**

Create `apps/web/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fintivi</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `apps/web/vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

Create `apps/web/tsconfig.json`:

```json
{
  "extends": "../../packages/config/tsconfig/base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "types": ["vite/client", "vitest/globals"],
    "noEmit": true
  },
  "include": ["src", "vite.config.ts"]
}
```

Create `apps/web/eslint.config.js`:

```js
import base from '@fintivi/config/eslint/base'

export default [
  ...base,
  { ignores: ['dist/**'] },
]
```

Create `apps/web/src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

Create `apps/web/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: Add initial app shell test**

Create `apps/web/src/app.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './app'

describe('App', () => {
  it('renders the public Fintivi entry screen', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /fintivi/i })).toBeInTheDocument()
    expect(screen.getByText(/daily finance home/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm --filter @fintivi/web test -- src/app.test.tsx`

Expected: FAIL because `apps/web/src/app.tsx` does not exist yet.

- [ ] **Step 5: Implement minimal app shell and styles**

Create `apps/web/src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import './styles.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element #root was not found')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

Create `apps/web/src/app.tsx`:

```tsx
export function App() {
  return (
    <main className="public-shell">
      <section className="hero-card">
        <p className="eyebrow">Fintivi</p>
        <h1>Fintivi</h1>
        <p>Build a calm daily finance home from your accounts and statement imports.</p>
        <a className="button" href="/login">Get started</a>
      </section>
    </main>
  )
}
```

Create `apps/web/src/styles.css`:

```css
:root {
  color: #17211b;
  background: #f7f3ea;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background: radial-gradient(circle at top left, #edf8ef 0, transparent 32rem), #f7f3ea;
}

a { color: inherit; }

button, input, select, textarea {
  font: inherit;
}

.public-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem;
}

.hero-card {
  width: min(100%, 44rem);
  padding: clamp(2rem, 6vw, 4rem);
  border: 1px solid #ded7c8;
  border-radius: 2rem;
  background: rgba(255, 252, 246, 0.9);
  box-shadow: 0 24px 80px rgba(36, 45, 37, 0.12);
}

.eyebrow {
  margin: 0 0 0.75rem;
  color: #587260;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(3rem, 9vw, 6rem);
  line-height: 0.9;
}

.hero-card p:last-of-type {
  max-width: 32rem;
  color: #526056;
  font-size: 1.15rem;
  line-height: 1.7;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  padding: 0 1.1rem;
  border-radius: 999px;
  background: #183d28;
  color: #fffaf0;
  font-weight: 700;
  text-decoration: none;
}
```

- [ ] **Step 6: Add shared helper components**

Create `apps/web/src/components/status-message.tsx`:

```tsx
import type { ReactNode } from 'react'

type StatusTone = 'info' | 'success' | 'warning' | 'error'

export function StatusMessage({ tone = 'info', children }: { tone?: StatusTone; children: ReactNode }) {
  return <div className={`status-message status-message--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>
}
```

Create `apps/web/src/components/form-field.tsx`:

```tsx
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

interface BaseFieldProps {
  id: string
  label: string
  error?: string
  hint?: string
}

export function TextField({ id, label, error, hint, ...props }: BaseFieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} {...props} />
      {hint ? <small id={`${id}-hint`}>{hint}</small> : null}
      {error ? <small id={`${id}-error`} className="field-error">{error}</small> : null}
    </label>
  )
}

export function SelectField({ id, label, error, hint, children, ...props }: BaseFieldProps & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} {...props}>{children}</select>
      {hint ? <small id={`${id}-hint`}>{hint}</small> : null}
      {error ? <small id={`${id}-error`} className="field-error">{error}</small> : null}
    </label>
  )
}
```

Create `apps/web/src/components/metric-card.tsx`:

```tsx
import type { ReactNode } from 'react'

export function MetricCard({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <article className="metric-card">
      <p>{label}</p>
      <strong>{value}</strong>
      {detail ? <span>{detail}</span> : null}
    </article>
  )
}
```

Create `apps/web/src/components/data-table.tsx`:

```tsx
import type { ReactNode } from 'react'

export function DataTable({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="table-wrap" role="region" aria-label={label} tabIndex={0}>
      <table>{children}</table>
    </div>
  )
}
```

Create `apps/web/src/lib/format.ts`:

```ts
export function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(amountMinor / 100)
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}
```

- [ ] **Step 7: Run package checks**

Run: `pnpm --filter @fintivi/web test -- src/app.test.tsx`

Expected: PASS, 1 test.

Run: `pnpm --filter @fintivi/web typecheck`

Expected: PASS.

Run: `pnpm --filter @fintivi/web lint`

Expected: PASS with zero errors.

- [ ] **Step 8: Commit if authorized**

Run only if commits were explicitly authorized:

```bash
git add apps/web/package.json apps/web/index.html apps/web/vite.config.ts apps/web/tsconfig.json apps/web/eslint.config.js apps/web/src
git commit -m "feat(web): scaffold React app shell"
```

---

### Task 2: API Client, Error Mapping, And Token Storage

**Files:**
- Create: `apps/web/src/api/types.ts`
- Create: `apps/web/src/api/client.ts`
- Create: `apps/web/src/lib/errors.ts`
- Create: `apps/web/src/auth/token-storage.ts`
- Test: `apps/web/src/api/client.test.ts`
- Test: `apps/web/src/auth/token-storage.test.ts`

**Interfaces:**
- Consumes: `AuthSession`, `ApiError`, and resource types from `apps/web/src/api/types.ts`.
- Produces: `ApiClient`, `createApiClient()`, `createDefaultApiClient()`, `loadStoredSession()`, `saveStoredSession()`, `clearStoredSession()`, and `messageForApiError()` for later auth and route tasks.

- [ ] **Step 1: Add shared API types**

Create `apps/web/src/api/types.ts` using the exact shared interface block from this plan's “Shared Interfaces To Use Across Tasks” section.

- [ ] **Step 2: Write failing token storage test**

Create `apps/web/src/auth/token-storage.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { clearStoredSession, loadStoredSession, saveStoredSession } from './token-storage'
import type { AuthSession } from '../api/types'

const session: AuthSession = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  sessionId: 'session-id',
  user: {
    id: 'user-id',
    email: 'user@example.com',
    market: 'global',
    locale: 'en',
    currency: 'USD',
    displayName: null,
  },
}

describe('token storage', () => {
  beforeEach(() => localStorage.clear())

  it('saves and loads the auth session', () => {
    saveStoredSession(session)

    expect(loadStoredSession()).toEqual(session)
  })

  it('clears the auth session', () => {
    saveStoredSession(session)
    clearStoredSession()

    expect(loadStoredSession()).toBeNull()
  })

  it('ignores malformed stored data', () => {
    localStorage.setItem('fintivi.auth', '{bad json')

    expect(loadStoredSession()).toBeNull()
  })
})
```

- [ ] **Step 3: Implement token storage**

Create `apps/web/src/auth/token-storage.ts`:

```ts
import type { AuthSession } from '../api/types'

const STORAGE_KEY = 'fintivi.auth'

export function loadStoredSession(): AuthSession | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.sessionId || !parsed.user?.id) return null
    return parsed
  } catch {
    return null
  }
}

export function saveStoredSession(session: AuthSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEY)
}
```

- [ ] **Step 4: Write failing API client tests**

Create `apps/web/src/api/client.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiClient, ApiRequestError } from './client'

describe('api client', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('returns response data and attaches bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { ok: true } }), { status: 200 }))
    const client = createApiClient({ baseUrl: 'https://api.test', fetchImpl: fetchMock, getAccessToken: () => 'token' })

    await expect(client.request<{ ok: boolean }>('/health')).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledWith('https://api.test/health', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer token' }),
    }))
  })

  it('throws an ApiRequestError for API error responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'Bad input' } }), { status: 400 }))
    const client = createApiClient({ baseUrl: 'https://api.test', fetchImpl: fetchMock })

    await expect(client.request('/broken')).rejects.toMatchObject({ code: 'VALIDATION_ERROR', message: 'Bad input', status: 400 })
  })

  it('refreshes once after a 401 and retries the original request', async () => {
    let accessToken = 'expired'
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 'TOKEN_EXPIRED', message: 'expired' } }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { accessToken: 'fresh', refreshToken: 'fresh-refresh', sessionId: 'session-id' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { ok: true } }), { status: 200 }))

    const client = createApiClient({
      baseUrl: 'https://api.test',
      fetchImpl: fetchMock,
      getAccessToken: () => accessToken,
      getRefreshToken: () => 'refresh-token',
      onRefresh: (next) => { accessToken = next.accessToken },
      onAuthExpired: vi.fn(),
    })

    await expect(client.request<{ ok: boolean }>('/dashboard')).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
```

- [ ] **Step 5: Implement error mapping and API client**

Create `apps/web/src/lib/errors.ts`:

```ts
import type { ApiError } from '../api/types'

const messages: Record<string, string> = {
  VALIDATION_ERROR: 'Check the highlighted fields and try again.',
  INVALID_STATE: 'This item is not ready for that action yet.',
  UNAUTHORIZED: 'Please sign in again.',
  INVALID_CREDENTIALS: 'Email or password is incorrect.',
  INVALID_OTP: 'The code is wrong or expired.',
  TOKEN_REUSED: 'Your session was revoked. Please sign in again.',
  TOKEN_EXPIRED: 'Your session expired. Please sign in again.',
  GOOGLE_AUTH_FAILED: 'Google sign-in failed. Try again with a verified Google account.',
  NOT_FOUND: 'This item is unavailable.',
  RATE_LIMITED: 'Too many attempts. Wait a bit, then try again.',
  SERVICE_UNAVAILABLE: 'Fintivi is temporarily unavailable. Try again soon.',
  NETWORK_ERROR: 'Network request failed. Check your connection and retry.',
}

export function messageForApiError(error: ApiError) {
  return messages[error.code] ?? error.message
}
```

Create `apps/web/src/api/client.ts`:

```ts
import type { ApiError, AuthSession } from './types'
import { clearStoredSession, loadStoredSession, saveStoredSession } from '../auth/token-storage'

interface RefreshResponse {
  accessToken: string
  refreshToken: string
  sessionId: string
}

interface ClientOptions {
  baseUrl?: string
  fetchImpl?: typeof fetch
  getAccessToken?: () => string | null
  getRefreshToken?: () => string | null
  onRefresh?: (tokens: RefreshResponse) => void
  onAuthExpired?: () => void
}

export class ApiRequestError extends Error implements ApiError {
  code: ApiError['code']
  status: number

  constructor(error: ApiError, status: number) {
    super(error.message)
    this.name = 'ApiRequestError'
    this.code = error.code
    this.status = status
  }
}

const defaultBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8001/api/v1'

export function createApiClient(options: ClientOptions = {}) {
  const baseUrl = (options.baseUrl ?? defaultBaseUrl).replace(/\/$/, '')
  const fetchImpl = options.fetchImpl ?? fetch

  async function refreshTokens(): Promise<boolean> {
    const refreshToken = options.getRefreshToken?.()
    if (!refreshToken) return false

    const response = await fetchImpl(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) return false
    const parsed = await response.json() as { data: RefreshResponse }
    options.onRefresh?.(parsed.data)
    return true
  }

  async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
    const headers = new Headers(init.headers)
    if (!(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

    const token = options.getAccessToken?.()
    if (token) headers.set('Authorization', `Bearer ${token}`)

    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}${path}`, { ...init, headers })
    } catch {
      throw new ApiRequestError({ code: 'NETWORK_ERROR', message: 'Network request failed' }, 0)
    }

    const parsed = await response.json().catch(() => ({})) as { data?: T; error?: ApiError }

    if (response.status === 401 && retry) {
      const refreshed = await refreshTokens()
      if (refreshed) return request<T>(path, init, false)
      options.onAuthExpired?.()
    }

    if (!response.ok) {
      throw new ApiRequestError(parsed.error ?? { code: 'NETWORK_ERROR', message: 'Request failed' }, response.status)
    }

    return parsed.data as T
  }

  return { request }
}

export function createDefaultApiClient() {
  return createApiClient({
    getAccessToken: () => loadStoredSession()?.accessToken ?? null,
    getRefreshToken: () => loadStoredSession()?.refreshToken ?? null,
    onRefresh: (tokens) => {
      const current = loadStoredSession()
      if (!current) return
      const next: AuthSession = { ...current, ...tokens }
      saveStoredSession(next)
    },
    onAuthExpired: () => clearStoredSession(),
  })
}
```

- [ ] **Step 6: Run focused tests**

Run: `pnpm --filter @fintivi/web test -- src/api/client.test.ts src/auth/token-storage.test.ts`

Expected: PASS.

Run: `pnpm --filter @fintivi/web typecheck`

Expected: PASS.

- [ ] **Step 7: Commit if authorized**

Run only if commits were explicitly authorized:

```bash
git add apps/web/src/api apps/web/src/auth/token-storage.ts apps/web/src/auth/token-storage.test.ts apps/web/src/lib/errors.ts
git commit -m "feat(web): add API client and token storage"
```

---

### Task 3: Auth Store, Routes, And Protected Navigation

**Files:**
- Create: `apps/web/src/api/auth.ts`
- Create: `apps/web/src/auth/auth-store.tsx`
- Create: `apps/web/src/auth/protected-route.tsx`
- Create: `apps/web/src/routes/auth/login-page.tsx`
- Create: `apps/web/src/routes/auth/signup-page.tsx`
- Create: `apps/web/src/routes/auth/google-callback-page.tsx`
- Modify: `apps/web/src/app.tsx`
- Test: `apps/web/src/auth/auth-store.test.tsx`
- Test: `apps/web/src/routes/auth/google-callback-page.test.tsx`

**Interfaces:**
- Consumes: `createApiClient()`, token storage, `AuthSession`.
- Produces: `AuthProvider`, `useAuth()`, `ProtectedRoute`, `loginWithEmail()`, `signupWithEmail()`, `requestOtp()`, `verifyOtp()`, `startGoogleSignIn()`.

- [ ] **Step 1: Add auth API wrappers**

Create `apps/web/src/api/auth.ts`:

```ts
import type { AuthSession } from './types'
import { createDefaultApiClient } from './client'

const api = createDefaultApiClient()

export interface SignupInput {
  email: string
  password: string
  market: 'global' | 'india'
  locale: string
  currency: string
}

export async function signupWithEmail(input: SignupInput) {
  return api.request<AuthSession>('/auth/signup', { method: 'POST', body: JSON.stringify(input) })
}

export async function loginWithEmail(input: { email: string; password: string }) {
  return api.request<AuthSession>('/auth/login', { method: 'POST', body: JSON.stringify(input) })
}

export async function requestOtp(input: { phone: string }) {
  return api.request<{ expiresAt: string; code?: string }>('/auth/otp/request', { method: 'POST', body: JSON.stringify(input) })
}

export async function verifyOtp(input: { phone: string; code: string; market?: 'global' | 'india' }) {
  const response = await api.request<{ userId: string; accessToken: string; refreshToken: string; sessionId: string }>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify(input),
  })

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    sessionId: response.sessionId,
    user: {
      id: response.userId,
      email: null,
      market: input.market ?? 'global',
      locale: input.market === 'india' ? 'en-IN' : 'en',
      currency: input.market === 'india' ? 'INR' : 'USD',
      displayName: null,
    },
  } satisfies AuthSession
}

export function getGoogleStartUrl() {
  return `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8001/api/v1'}/auth/google/start`
}
```

- [ ] **Step 2: Write failing auth store test**

Create `apps/web/src/auth/auth-store.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthProvider, useAuth } from './auth-store'
import { saveStoredSession } from './token-storage'

function Probe() {
  const auth = useAuth()
  return <div>{auth.session ? auth.session.user.id : 'signed-out'}</div>
}

describe('AuthProvider', () => {
  it('restores a saved session', () => {
    saveStoredSession({
      accessToken: 'access',
      refreshToken: 'refresh',
      sessionId: 'session',
      user: { id: 'user-id', email: 'user@example.com', market: 'global', locale: 'en', currency: 'USD', displayName: null },
    })

    render(<AuthProvider><Probe /></AuthProvider>)

    expect(screen.getByText('user-id')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Implement auth store and protected route**

Create `apps/web/src/auth/auth-store.tsx`:

```tsx
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { AuthSession } from '../api/types'
import { clearStoredSession, loadStoredSession, saveStoredSession } from './token-storage'

interface AuthContextValue {
  session: AuthSession | null
  setSession: (session: AuthSession) => void
  updateTokens: (tokens: { accessToken: string; refreshToken: string; sessionId: string }) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(() => loadStoredSession())

  const value = useMemo<AuthContextValue>(() => ({
    session,
    setSession(next) {
      setSessionState(next)
      saveStoredSession(next)
    },
    updateTokens(tokens) {
      setSessionState((current) => {
        if (!current) return current
        const next = { ...current, ...tokens }
        saveStoredSession(next)
        return next
      })
    },
    logout() {
      clearStoredSession()
      setSessionState(null)
    },
  }), [session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
```

Create `apps/web/src/auth/protected-route.tsx`:

```tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './auth-store'

export function ProtectedRoute() {
  const { session } = useAuth()
  const location = useLocation()

  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  return <Outlet />
}
```

- [ ] **Step 4: Add auth pages and routing**

Create basic implementations for `login-page.tsx`, `signup-page.tsx`, and `google-callback-page.tsx` that use the wrappers from Step 1. `google-callback-page.tsx` must parse `window.location.hash` with `URLSearchParams`, build an `AuthSession`, call `setSession(session)`, and call `window.history.replaceState(null, '', '/dashboard')` before navigating to `/dashboard`.

Use this fragment parser in `google-callback-page.tsx`:

```ts
function parseGoogleFragment(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const accessToken = params.get('accessToken')
  const refreshToken = params.get('refreshToken')
  const sessionId = params.get('sessionId')
  const id = params.get('userId')
  const email = params.get('email')
  const market = params.get('market') === 'india' ? 'india' : 'global'
  if (!accessToken || !refreshToken || !sessionId || !id) return null
  return {
    accessToken,
    refreshToken,
    sessionId,
    user: { id, email, market, locale: 'en', currency: market === 'india' ? 'INR' : 'USD', displayName: null },
  }
}
```

Modify `apps/web/src/app.tsx` to use `BrowserRouter`, `AuthProvider`, and routes for `/login`, `/signup`, `/auth/google/callback`, `/dashboard`, and a protected route group.

- [ ] **Step 5: Run auth tests**

Run: `pnpm --filter @fintivi/web test -- src/auth/auth-store.test.tsx src/routes/auth/google-callback-page.test.tsx`

Expected: PASS.

Run: `pnpm --filter @fintivi/web typecheck`

Expected: PASS.

- [ ] **Step 6: Commit if authorized**

Run only if commits were explicitly authorized:

```bash
git add apps/web/src/api/auth.ts apps/web/src/auth apps/web/src/routes/auth apps/web/src/app.tsx
git commit -m "feat(web): add authentication flows"
```

---

### Task 4: Browser API Polish For CORS And Google OAuth Redirect

**Files:**
- Modify: `apps/api/src/env.ts`
- Modify: `apps/api/src/server.ts`
- Modify: `apps/api/src/routes/auth.ts`
- Modify: `apps/api/tests/google-auth.test.ts`
- Modify: `apps/api/tests/env.test.ts`
- Modify: `.env.example`
- Modify: `turbo.json`
- Modify: `docs/API.md`

**Interfaces:**
- Consumes: Existing API env parsing and Google OAuth callback.
- Produces: `env.WEB_APP_URL`, `env.CORS_ORIGIN`, CORS configured for web app, and Google callback redirect fragment consumed by `google-callback-page.tsx`.

- [ ] **Step 1: Write failing env tests**

Add to `apps/api/tests/env.test.ts`:

```ts
it('defaults web browser integration env values for local development', () => {
  const parsed = parseEnv({
    DATABASE_URL: 'postgres://user:pass@localhost:5432/fintivi',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    REFRESH_TOKEN_SECRET: 'b'.repeat(32),
    PHONE_HASH_PEPPER: 'pepper-pepper-123',
    OTP_PROVIDER: 'test',
    GOOGLE_CLIENT_ID: 'google-client-id',
    GOOGLE_CLIENT_SECRET: 'google-client-secret',
    GOOGLE_REDIRECT_URI: 'http://localhost:8001/api/v1/auth/google/callback',
    NODE_ENV: 'development',
  })

  expect(parsed.WEB_APP_URL).toBe('http://localhost:5173')
  expect(parsed.CORS_ORIGIN).toBe('http://localhost:5173')
})
```

- [ ] **Step 2: Implement env additions**

Modify `apps/api/src/env.ts` schema:

```ts
WEB_APP_URL: z.string().url().default('http://localhost:5173'),
CORS_ORIGIN: z.string().default('http://localhost:5173'),
```

Modify `turbo.json` `globalEnv` to include:

```json
"WEB_APP_URL",
"CORS_ORIGIN",
"VITE_API_BASE_URL"
```

Update `.env.example` with:

```dotenv
WEB_APP_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
VITE_API_BASE_URL=http://localhost:8001/api/v1
```

- [ ] **Step 3: Configure explicit CORS**

Modify `apps/api/src/server.ts`:

```ts
const corsOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
app.register(cors, { origin: corsOrigins })
```

Replace the existing `app.register(cors)` call.

- [ ] **Step 4: Write failing Google redirect test**

In `apps/api/tests/google-auth.test.ts`, add a test that mocks Google token exchange/verify and asserts `/api/v1/auth/google/callback?code=ok` returns a redirect whose `location` starts with `http://localhost:5173/auth/google/callback#accessToken=` and includes `refreshToken`, `sessionId`, `userId`, `email`, and `market`.

Expected assertion shape:

```ts
expect(response.statusCode).toBe(302)
const location = response.headers.location
expect(location).toContain('http://localhost:5173/auth/google/callback#')
expect(location).toContain('accessToken=')
expect(location).toContain('refreshToken=')
expect(location).toContain('sessionId=')
expect(location).toContain('userId=')
expect(location).toContain('email=')
expect(location).toContain('market=global')
```

- [ ] **Step 5: Implement Google callback redirect**

Modify `apps/api/src/routes/auth.ts` successful Google callback branch to build a fragment:

```ts
const fragment = new URLSearchParams({
  accessToken,
  refreshToken,
  sessionId: session.id,
  userId: user.id,
  email: user.email ?? '',
  market: user.market,
})

return reply.redirect(`${env.WEB_APP_URL}/auth/google/callback#${fragment.toString()}`, 302)
```

For callback failures after the browser has entered this route, redirect to:

```ts
return reply.redirect(`${env.WEB_APP_URL}/auth/google/callback#error=GOOGLE_AUTH_FAILED`, 302)
```

Keep validation errors for missing `code` as `400 VALIDATION_ERROR` unless the test suite chooses to align all callback failures to redirect.

- [ ] **Step 6: Update API docs**

Modify `docs/API.md` Google callback section to state that browser callbacks redirect to `/auth/google/callback#...` on the web app with fragment tokens for P0.

- [ ] **Step 7: Run API tests**

Run: `pnpm --filter @fintivi/api test -- tests/env.test.ts tests/google-auth.test.ts`

Expected: PASS.

Run: `pnpm --filter @fintivi/api typecheck`

Expected: PASS.

- [ ] **Step 8: Commit if authorized**

Run only if commits were explicitly authorized:

```bash
git add apps/api/src/env.ts apps/api/src/server.ts apps/api/src/routes/auth.ts apps/api/tests/env.test.ts apps/api/tests/google-auth.test.ts .env.example turbo.json docs/API.md
git commit -m "feat(api): support browser OAuth callback"
```

---

### Task 5: Dashboard Home Route

**Files:**
- Create: `apps/web/src/api/dashboard.ts`
- Create: `apps/web/src/components/app-layout.tsx`
- Create: `apps/web/src/routes/dashboard/dashboard-page.tsx`
- Modify: `apps/web/src/app.tsx`
- Test: `apps/web/src/routes/dashboard/dashboard-page.test.tsx`

**Interfaces:**
- Consumes: `DashboardSummary`, auth session, `MetricCard`, `formatMoney()`, `formatDate()`.
- Produces: Signed-in layout and dashboard route used as the app home.

- [ ] **Step 1: Add dashboard API wrapper**

Create `apps/web/src/api/dashboard.ts`:

```ts
import { createDefaultApiClient } from './client'
import type { DashboardSummary } from './types'

const api = createDefaultApiClient()

export function getDashboard(params?: { from?: string; to?: string }) {
  const query = new URLSearchParams()
  if (params?.from) query.set('from', params.from)
  if (params?.to) query.set('to', params.to)
  return api.request<DashboardSummary>(`/dashboard${query.size ? `?${query.toString()}` : ''}`)
}
```

- [ ] **Step 2: Write failing dashboard render test**

Create `apps/web/src/routes/dashboard/dashboard-page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DashboardView } from './dashboard-page'
import type { DashboardSummary } from '../../api/types'

const summary: DashboardSummary = {
  range: { from: '2026-06-01T00:00:00.000Z', to: '2026-06-30T00:00:00.000Z' },
  currency: 'USD',
  cashflow: { incomeMinor: 500000, expenseMinor: 40000, netMinor: 460000 },
  accounts: [{ id: 'acct-1', name: 'Checking', balanceMinor: 120000, currency: 'USD' }],
  recentTransactions: [{ id: 'txn-1', postedAt: '2026-06-17', description: 'Restaurant', amountMinor: -15000, currency: 'USD', accountName: 'Checking', categoryName: 'Food' }],
  categoryBreakdown: [{ categoryName: 'Food', type: 'expense', amountMinor: 40000 }],
  dataHealth: { lastUploadAt: '2026-07-04T10:00:00.000Z', pendingReviewCount: 1, failedUploadCount: 0 },
}

describe('DashboardView', () => {
  it('renders cashflow, accounts, data health, and recent transactions', () => {
    render(<DashboardView summary={summary} />)

    expect(screen.getByRole('heading', { name: /daily finance/i })).toBeInTheDocument()
    expect(screen.getByText('$4,600.00')).toBeInTheDocument()
    expect(screen.getByText('Checking')).toBeInTheDocument()
    expect(screen.getByText('Restaurant')).toBeInTheDocument()
    expect(screen.getByText(/1 pending review/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Implement layout and dashboard view**

Create `apps/web/src/components/app-layout.tsx` with nav links to Dashboard, Accounts, Import, Transactions, Settings, and an `<Outlet />`.

Create `apps/web/src/routes/dashboard/dashboard-page.tsx` with:

```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MetricCard } from '../../components/metric-card'
import { DataTable } from '../../components/data-table'
import { StatusMessage } from '../../components/status-message'
import { getDashboard } from '../../api/dashboard'
import type { DashboardSummary } from '../../api/types'
import { formatDate, formatMoney } from '../../lib/format'

export function DashboardView({ summary }: { summary: DashboardSummary }) {
  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Daily finance</h1>
        </div>
        <Link className="button" to="/uploads/new">Import statement</Link>
      </div>
      <div className="metric-grid">
        <MetricCard label="Net cashflow" value={formatMoney(summary.cashflow.netMinor, summary.currency)} detail={`${formatMoney(summary.cashflow.incomeMinor, summary.currency)} in, ${formatMoney(summary.cashflow.expenseMinor, summary.currency)} out`} />
        <MetricCard label="Data health" value={`${summary.dataHealth.pendingReviewCount} pending review`} detail={summary.dataHealth.lastUploadAt ? `Last upload ${formatDate(summary.dataHealth.lastUploadAt)}` : 'No uploads yet'} />
      </div>
      <section className="card-grid">
        {summary.accounts.map((account) => <MetricCard key={account.id} label={account.name} value={formatMoney(account.balanceMinor, account.currency)} />)}
      </section>
      <DataTable label="Recent transactions">
        <thead><tr><th>Date</th><th>Description</th><th>Account</th><th>Category</th><th>Amount</th></tr></thead>
        <tbody>{summary.recentTransactions.map((txn) => <tr key={txn.id}><td>{formatDate(txn.postedAt)}</td><td>{txn.description}</td><td>{txn.accountName}</td><td>{txn.categoryName ?? 'Uncategorized'}</td><td>{formatMoney(txn.amountMinor, txn.currency)}</td></tr>)}</tbody>
      </DataTable>
    </section>
  )
}

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getDashboard().then(setSummary).catch(() => setError('Dashboard could not load. Try again.'))
  }, [])

  if (error) return <StatusMessage tone="error">{error}</StatusMessage>
  if (!summary) return <StatusMessage>Loading dashboard...</StatusMessage>
  return <DashboardView summary={summary} />
}
```

- [ ] **Step 4: Wire protected dashboard route**

Modify `apps/web/src/app.tsx` so `/dashboard` renders inside `ProtectedRoute` and `AppLayout`.

- [ ] **Step 5: Run dashboard checks**

Run: `pnpm --filter @fintivi/web test -- src/routes/dashboard/dashboard-page.test.tsx`

Expected: PASS.

Run: `pnpm --filter @fintivi/web typecheck`

Expected: PASS.

- [ ] **Step 6: Commit if authorized**

Run only if commits were explicitly authorized:

```bash
git add apps/web/src/api/dashboard.ts apps/web/src/components/app-layout.tsx apps/web/src/routes/dashboard apps/web/src/app.tsx
git commit -m "feat(web): add dashboard home"
```

---

### Task 6: Accounts Management

**Files:**
- Create: `apps/web/src/api/accounts.ts`
- Create: `apps/web/src/routes/accounts/accounts-page.tsx`
- Modify: `apps/web/src/app.tsx`
- Test: `apps/web/src/routes/accounts/accounts-page.test.tsx`

**Interfaces:**
- Consumes: `Account`, `TextField`, `SelectField`, `formatMoney()`.
- Produces: `listAccounts()`, `createAccount()`, `updateAccount()`, and a selectable account list used by uploads.

- [ ] **Step 1: Add account API wrapper**

Create `apps/web/src/api/accounts.ts`:

```ts
import { createDefaultApiClient } from './client'
import type { Account } from './types'

const api = createDefaultApiClient()

export function listAccounts() {
  return api.request<Account[]>('/accounts')
}

export function createAccount(input: { name: string; type: string; bank: string; currency: string; balanceMinor: number }) {
  return api.request<Account>('/accounts', { method: 'POST', body: JSON.stringify(input) })
}

export function updateAccount(id: string, input: Partial<{ name: string; type: string; bank: string; currency: string; balanceMinor: number; isActive: boolean }>) {
  return api.request<Account>(`/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}
```

- [ ] **Step 2: Write failing accounts view test**

Create `apps/web/src/routes/accounts/accounts-page.test.tsx` asserting `AccountsView` renders account names, balances, and a create form button.

Use this test shape:

```tsx
render(<AccountsView accounts={[{ id: 'a1', userId: 'u1', name: 'Checking', type: 'checking', bank: 'Bank', currency: 'USD', balanceMinor: 120000, isActive: true }]} onCreate={vi.fn()} onDeactivate={vi.fn()} />)
expect(screen.getByText('Checking')).toBeInTheDocument()
expect(screen.getByText('$1,200.00')).toBeInTheDocument()
expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
```

- [ ] **Step 3: Implement accounts page**

Create `apps/web/src/routes/accounts/accounts-page.tsx` exporting `AccountsView` and `AccountsPage`. `AccountsView` should accept `accounts`, `onCreate`, and `onDeactivate` props so tests avoid network calls. `AccountsPage` should load accounts on mount and refresh after create/deactivate.

The create form must submit:

```ts
{
  name,
  type,
  bank,
  currency,
  balanceMinor: Math.round(Number(balanceMajor) * 100),
}
```

Deactivation must call:

```ts
updateAccount(account.id, { isActive: false })
```

- [ ] **Step 4: Wire route and run checks**

Add `/accounts` protected route in `apps/web/src/app.tsx`.

Run: `pnpm --filter @fintivi/web test -- src/routes/accounts/accounts-page.test.tsx`

Expected: PASS.

Run: `pnpm --filter @fintivi/web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit if authorized**

Run only if commits were explicitly authorized:

```bash
git add apps/web/src/api/accounts.ts apps/web/src/routes/accounts apps/web/src/app.tsx
git commit -m "feat(web): add account management"
```

---

### Task 7: Upload, SSE Progress, Preview, And Confirm Import

**Files:**
- Create: `apps/web/src/api/uploads.ts`
- Create: `apps/web/src/routes/uploads/upload-page.tsx`
- Create: `apps/web/src/routes/uploads/upload-preview-page.tsx`
- Modify: `apps/web/src/app.tsx`
- Test: `apps/web/src/routes/uploads/upload-preview-page.test.tsx`

**Interfaces:**
- Consumes: `UploadPreview`, `UploadProgressEvent`, `Account`, `listAccounts()`.
- Produces: `uploadStatement()`, `subscribeToUploadProgress()`, `getUploadPreview()`, `confirmUpload()` and complete import UI.

- [ ] **Step 1: Add uploads API wrapper**

Create `apps/web/src/api/uploads.ts`:

```ts
import type { UploadPreview, UploadProgressEvent } from './types'
import { createDefaultApiClient } from './client'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8001/api/v1'
const api = createDefaultApiClient()

export async function uploadStatement(file: File) {
  const body = new FormData()
  body.append('file', file)
  return api.request<{ jobId: string }>('/uploads', { method: 'POST', body })
}

export function getUploadPreview(jobId: string) {
  return api.request<UploadPreview>(`/uploads/${jobId}/preview`)
}

export function confirmUpload(jobId: string, accountId: string) {
  return api.request<{ imported: number; skipped: number; duplicates: number }>(`/uploads/${jobId}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ accountId }),
  })
}

export function subscribeToUploadProgress(jobId: string, handlers: { onProgress: (event: UploadProgressEvent) => void; onComplete: (event: unknown) => void; onError: () => void }) {
  const source = new EventSource(`${baseUrl}/uploads/${jobId}/stream`)
  source.addEventListener('progress', (event) => handlers.onProgress(JSON.parse((event as MessageEvent).data) as UploadProgressEvent))
  source.addEventListener('complete', (event) => {
    handlers.onComplete(JSON.parse((event as MessageEvent).data) as unknown)
    source.close()
  })
  source.onerror = () => {
    handlers.onError()
    source.close()
  }
  return () => source.close()
}
```

- [ ] **Step 2: Write failing preview test**

Create `apps/web/src/routes/uploads/upload-preview-page.test.tsx` asserting `UploadPreviewView` renders warnings, transaction rows, account selector, and confirm button.

Use preview fixture:

```ts
const preview = {
  candidates: [{ id: 'generic-csv', label: 'Generic CSV', confidence: 1 }],
  warnings: ['2 rows skipped'],
  transactions: [{ postedAt: '2026-01-15', description: 'Amazon', amountMinor: -2999, currency: 'USD', externalFingerprint: 'fp1' }],
}
```

- [ ] **Step 3: Implement upload page**

Create `upload-page.tsx` with file chooser, allowed file text, progress list, and navigation to `/uploads/:jobId/preview` when stage is `preview_ready`.

The upload submit handler should:

```ts
const result = await uploadStatement(file)
setJobId(result.jobId)
subscribeToUploadProgress(result.jobId, {
  onProgress: setProgress,
  onComplete: (event) => {
    if ((event as { status?: string }).status === 'preview_ready') navigate(`/uploads/${result.jobId}/preview`)
  },
  onError: () => setError('Upload progress connection failed. Refresh to check the job.'),
})
```

- [ ] **Step 4: Implement preview page**

Create `upload-preview-page.tsx` with exported `UploadPreviewView`. It should show warning callouts, table rows, account selector, and confirm result. On confirm success, show `Imported X, skipped Y, duplicates Z` and link back to `/dashboard`.

- [ ] **Step 5: Wire routes and run checks**

Add `/uploads/new` and `/uploads/:jobId/preview` protected routes.

Run: `pnpm --filter @fintivi/web test -- src/routes/uploads/upload-preview-page.test.tsx`

Expected: PASS.

Run: `pnpm --filter @fintivi/web typecheck`

Expected: PASS.

- [ ] **Step 6: Commit if authorized**

Run only if commits were explicitly authorized:

```bash
git add apps/web/src/api/uploads.ts apps/web/src/routes/uploads apps/web/src/app.tsx
git commit -m "feat(web): add statement import flow"
```

---

### Task 8: Transactions And Settings

**Files:**
- Create: `apps/web/src/api/transactions.ts`
- Create: `apps/web/src/api/users.ts`
- Create: `apps/web/src/routes/transactions/transactions-page.tsx`
- Create: `apps/web/src/routes/transactions/split-transaction-page.tsx`
- Create: `apps/web/src/routes/settings/settings-page.tsx`
- Modify: `apps/web/src/app.tsx`
- Test: `apps/web/src/routes/transactions/transactions-page.test.tsx`
- Test: `apps/web/src/routes/settings/settings-page.test.tsx`

**Interfaces:**
- Consumes: `Transaction`, `UserProfile`, `formatMoney()`, `formatDate()`, auth logout.
- Produces: transaction list/edit/delete/split basics and profile settings.

- [ ] **Step 1: Add API wrappers**

Create `apps/web/src/api/transactions.ts`:

```ts
import { createDefaultApiClient } from './client'
import type { Transaction } from './types'

const api = createDefaultApiClient()

export function listTransactions(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params)
  return api.request<{ data?: Transaction[] } | Transaction[]>(`/transactions${query.size ? `?${query.toString()}` : ''}`)
}

export function updateTransaction(id: string, input: { categoryId?: string | null; notes?: string | null }) {
  return api.request<Transaction>(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function deleteTransaction(id: string) {
  return api.request<{ ok: boolean }>(`/transactions/${id}`, { method: 'DELETE' })
}

export function splitTransaction(id: string, splits: Array<{ amountMinor: number; description: string; categoryId: string | null }>) {
  return api.request<Transaction[]>(`/transactions/${id}/split`, { method: 'POST', body: JSON.stringify({ splits }) })
}
```

Create `apps/web/src/api/users.ts`:

```ts
import { createDefaultApiClient } from './client'
import type { UserProfile } from './types'

const api = createDefaultApiClient()

export function getCurrentUser() {
  return api.request<UserProfile>('/users/me')
}

export function updateCurrentUser(input: Partial<Pick<UserProfile, 'displayName' | 'locale' | 'currency'>>) {
  return api.request<UserProfile>('/users/me', { method: 'PATCH', body: JSON.stringify(input) })
}
```

- [ ] **Step 2: Write failing route tests**

Create tests that render pure view components:

```tsx
render(<TransactionsView transactions={[{ id: 't1', userId: 'u1', accountId: 'a1', postedAt: '2026-01-15', description: 'Amazon', amountMinor: -2999, currency: 'USD', categoryId: null, notes: null, externalFingerprint: 'fp1' }]} onUpdate={vi.fn()} onDelete={vi.fn()} />)
expect(screen.getByText('Amazon')).toBeInTheDocument()
expect(screen.getByText('-$29.99')).toBeInTheDocument()
```

```tsx
render(<SettingsView user={{ id: 'u1', email: 'user@example.com', displayName: null, market: 'global', locale: 'en', currency: 'USD' }} onSave={vi.fn()} onLogout={vi.fn()} />)
expect(screen.getByDisplayValue('en')).toBeInTheDocument()
expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument()
```

- [ ] **Step 3: Implement transactions page**

Create `TransactionsView` and `TransactionsPage`. The view should include search/date filters, transaction rows, notes/category edit controls, delete button, and split link. The page should load via `listTransactions()` and refresh after update/delete.

- [ ] **Step 4: Implement split page**

Create `SplitTransactionPage` with two split rows by default. Validate the split total client-side before submit and show `Split amounts must match the original transaction total` if mismatched.

- [ ] **Step 5: Implement settings page**

Create `SettingsView` and `SettingsPage`. The page loads `/users/me`, updates display name/locale/currency, and calls `logout()` from auth context.

- [ ] **Step 6: Wire routes and run checks**

Add `/transactions`, `/transactions/:id/split`, and `/settings` protected routes.

Run: `pnpm --filter @fintivi/web test -- src/routes/transactions/transactions-page.test.tsx src/routes/settings/settings-page.test.tsx`

Expected: PASS.

Run: `pnpm --filter @fintivi/web typecheck`

Expected: PASS.

- [ ] **Step 7: Commit if authorized**

Run only if commits were explicitly authorized:

```bash
git add apps/web/src/api/transactions.ts apps/web/src/api/users.ts apps/web/src/routes/transactions apps/web/src/routes/settings apps/web/src/app.tsx
git commit -m "feat(web): add transactions and settings"
```

---

### Task 9: Full Verification, Docs, And Cleanup

**Files:**
- Create: `README.md`
- Modify: `docs/API.md`
- Modify: `apps/web/src/styles.css`
- Modify: any files needed to fix verification failures from prior tasks.

**Interfaces:**
- Consumes: Complete API and web app.
- Produces: Verified local dev workflow and documentation.

- [ ] **Step 1: Add README**

Create `README.md`:

````md
# Fintivi

Fintivi is a personal finance app with a Fastify API and Vite React web app.

## Requirements

- Node.js 20.11+
- pnpm 11.9.0
- PostgreSQL database URL in `.env`

## Local Setup

Copy `.env.example` to `.env` and fill database and secret values.

Run migrations:

```bash
pnpm db:migrate
```

Start API and web app:

```bash
pnpm dev
```

Local URLs:

- API: `http://localhost:8001/api/v1`
- Web: `http://localhost:5173`

## Verification

```bash
pnpm test
pnpm typecheck
pnpm lint
```
````

- [ ] **Step 2: Document web env**

Update `docs/API.md` base URL section with:

````md
## Web App

Local web app URL:

```text
http://localhost:5173
```

Browser integration env vars:

- `WEB_APP_URL`: API redirect target for browser flows. Defaults to `http://localhost:5173`.
- `CORS_ORIGIN`: comma-separated browser origins allowed by the API. Defaults to `http://localhost:5173`.
- `VITE_API_BASE_URL`: frontend API base URL. Defaults to `http://localhost:8001/api/v1`.
````

- [ ] **Step 3: Run full verification**

Run: `pnpm test`

Expected: PASS for API, auth, db, parsers, and web tests.

Run: `pnpm typecheck`

Expected: PASS for all packages.

Run: `pnpm lint`

Expected: zero errors. Existing warnings are acceptable only if unchanged and documented in the final report.

Run: `pnpm db:migrate`

Expected: migrations applied successfully or already applied.

- [ ] **Step 4: Run local health and web smoke check**

Start dev server with a bounded command, then verify:

```bash
pnpm dev
```

Expected API checks:

```bash
curl -fsS http://localhost:8001/api/v1/health
curl -fsS http://localhost:8001/api/v1/health/ready
```

Expected web check:

```bash
curl -fsS http://localhost:5173
```

Expected: API returns `{"data":{"ok":true}}` and readiness with `"db":"connected"`; web returns HTML containing `Fintivi`.

- [ ] **Step 5: Remove generated artifacts**

Check status:

```bash
git status --short
```

If test/build regenerated tracked cache artifacts, delete only those generated files with an explicit patch. Do not delete user-authored files.

- [ ] **Step 6: Commit if authorized**

Run only if commits were explicitly authorized and all verification passed:

```bash
git add README.md docs/API.md apps/web/src/styles.css
git commit -m "docs: add web app setup and verification"
```

---

## Self-Review Checklist

- Spec coverage: tasks cover `apps/web` scaffold, auth, dashboard, accounts, upload/import, transactions, settings, API browser polish, tests, docs, and final verification.
- Scope check: P0 remains a single vertical product shell; advanced analytics, bank connections, category rule UI, and design-system extraction stay out of scope.
- Placeholder scan: no implementation step relies on unnamed files or unspecified behavior; where a full component is large, the plan names exported component contracts and exact assertions.
- Type consistency: shared types are defined once in `apps/web/src/api/types.ts`; later tasks consume the same names.
- Commit policy: commit steps are present for implementation discipline but explicitly gated on user authorization.
