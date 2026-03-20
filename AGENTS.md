# Agent Handoff — gitlab-browser

This file is intended for AI agents (Cursor, Copilot, Claude, etc.) picking up development of this project. Read it fully before making any changes.

---

## What this project is

A full-featured GitLab frontend web app that authenticates via **Personal Access Token (PAT)** — no individual GitLab license required. Built because teams were handing out PATs + `glab` CLI just so members could browse repos and check pipelines.

- **Live demo**: https://glabrowser-bchpz.ondigitalocean.app/
- **GitHub**: https://github.com/gauthamp10/gitlab-browser
- **Branch**: `feature/base` (all development happens here, not `main`)

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript + Vite 5 |
| Routing | React Router v6 |
| Data fetching | TanStack Query v5 |
| State | Zustand v5 with persistence |
| UI | shadcn/ui (Radix primitives) + Tailwind CSS v3 |
| Syntax highlighting | Shiki v1 (lazy-loaded per language) |
| Icons | Lucide React |
| Dates | date-fns v3 |
| ANSI logs | ansi-to-html (`escapeXML: true`) |
| Testing | Vitest + jsdom + @testing-library/react |
| Deployment | Docker multi-stage (node:20-alpine → nginx:alpine) |

---

## Project structure

```
src/
  api/          # GitLab REST API v4 client modules (one file per resource)
  components/   # Reusable UI components
    layout/     # AppLayout, Sidebar, Topbar, ProjectLayout
    common/     # EmptyState, ErrorMessage, PermGate, ContributionHeatmap …
    repository/ # UploadFileDialog, InlineEditor, CreateBranchDialog
    pipelines/  # JobLog, PipelineStatus
    mergeRequests/ # CreateMRDialog
    projects/   # CreateProjectDialog
    ui/         # shadcn/ui primitives (do not edit manually)
  pages/        # Route-level page components
    project/    # All per-project pages (Repository, Issues, MRs, Pipelines …)
  store/        # Zustand stores (auth.ts, settings.ts)
  hooks/        # Custom React hooks
  utils/        # Pure utilities (crypto, url, safeHref, gitGraph, format)
  types/        # gitlab.ts — all GitLab API response types
  test/         # Vitest setup file
  __tests__/    # Test suites (mirrors src/ structure)
```

---

## Authentication model

- `token === null` → not logged in → redirect to `/login`
- `token === ''` → **guest mode** (unauthenticated, public repos only)
- `token === 'glpat-...'` → fully authenticated

PATs are encrypted in `localStorage` using **WebCrypto AES-GCM-256** (`src/utils/crypto.ts`). The session key lives in `sessionStorage` and is regenerated each browser session.

The `ApiProvider` (`src/api/index.ts`) creates the API client when `token !== null`. When `token === ''` the client omits the `PRIVATE-TOKEN` header, enabling public API access.

`PrivateRoute` (`src/components/PrivateRoute.tsx`) checks `token === null` (not `!token`) to allow guest mode through.

---

## API client

`src/api/client.ts` — `createApiClient({ host, token })` returns a typed client with:
- `request<T>()` — single resource
- `requestPaged<T>()` — paginated, returns `{ items, pagination }`
- `requestText()` — raw text (file content)
- `fetchBlob()` — binary download via `URL.createObjectURL()`

`ApiError` (exported from `client.ts`) carries a numeric `status` property. Always use `err instanceof ApiError` + `err.status` for error handling — **never render `err.message` directly into the DOM** (CodeQL taint violation).

All API modules live in `src/api/` and are aggregated in `src/api/index.ts`.

---

## Security rules — CRITICAL

These were the result of a full security audit. Do not regress them.

1. **Never put `err.message` from API responses into React state/DOM.** Use `err.status` (a number) to select a hardcoded string instead.
2. **Never interpolate the `host` input into href attributes.** Use `new URL(host).origin` (URL-parser output) for links.
3. **`safeExternalHref(url)`** (`src/utils/safeHref.ts`) — use for any API-sourced URL going into `href` or `img src`.
4. **PAT must never appear in URL query strings.** Always use the `PRIVATE-TOKEN` header. File downloads use `fetchBlob()` + `URL.createObjectURL()`.
5. **CSP, HSTS, X-Frame-Options** are set in `nginx-vhost.conf`. Do not weaken them.
6. **`nginx.conf`** runs nginx as non-root, uses `/tmp` for pid/temp files.

Security implementation details: `SECURITY.md`

---

## Permission system

`src/hooks/useTokenPermissions.ts` — detects PAT scopes by probing the API.

`src/components/common/PermGate.tsx` — wraps UI elements, disabling/greying them when the token lacks the required scope. Use `<PermGate scope="write_repository">` pattern.

---

## Guest mode specifics

- `browseAsGuest(host)` in auth store sets `token: ''`
- Dashboard: `starredProjects` query is gated with `enabled: !!user`
- Search page: Projects scope uses `GET /projects?search=...&visibility=public` (not `/search` which requires auth). Other scopes (issues, MRs, commits, blobs) are disabled with a lock icon and sign-in prompt.
- Sidebar/Login: `queryClient.clear()` is called on logout AND on guest login to prevent cache bleed between sessions.

---

## Testing

```bash
# Run all tests in Docker (recommended)
docker run --rm -v $(pwd):/app -w /app node:20-alpine \
  sh -c "node_modules/.bin/vitest run --reporter=verbose"

# TypeScript check + production build
docker run --rm -v $(pwd):/app -w /app node:20-alpine \
  sh -c "node_modules/.bin/tsc --noEmit && node_modules/.bin/vite build"
```

**117 tests** across 7 test files. Always run tests before pushing. All must pass.

Test files:
- `src/__tests__/utils/url.test.ts` — 33 tests
- `src/__tests__/utils/crypto.test.ts` — 16 tests
- `src/__tests__/security/safeHref.test.ts` — 15 tests
- `src/__tests__/api/client.test.ts` — 19 tests
- `src/__tests__/store/auth.test.ts` — 12 tests
- `src/__tests__/components/JobLog.test.tsx` — 10 tests
- `src/__tests__/components/Login.test.tsx` — 12 tests

---

## Local development

```bash
# Run the app locally
docker compose up --build

# App is served at http://localhost:3000
```

Dependencies are installed inside the Docker build — no local Node.js needed.

---

## CI/CD (GitHub Actions)

Workflows in `.github/workflows/`:

| File | What it does |
|---|---|
| `ci.yml` | TypeScript check, ESLint, Vitest (117 tests) |
| `security.yml` | `npm audit`, gitleaks secret scan, dependency review |
| `codeql.yml` | CodeQL static analysis (JavaScript/TypeScript) |
| `release.yml` | Builds and pushes Docker image on tag |

All checks must be green before merging. Use `[skip ci]` in commit message only for docs-only changes (e.g. README URL updates).

---

## Known issues / gotchas

1. **`nginx.conf` user directive warning** — nginx logs a warning about the `user` directive being ignored (non-root). This is harmless and expected.
2. **`node_modules/.bin/vitest` spawn error** — vitest cannot run directly on this host (no Node.js installed locally). Always use Docker for tests.
3. **Chunk size warnings** — Vite warns about large chunks (Shiki language packs). These are expected and not errors. Consider code-splitting if bundle size becomes a concern.
4. **`package-lock.json`** — Dockerfile uses `npm install --legacy-peer-deps` (not `npm ci`) because there is no lock file committed.

---

## Pending / future improvements

- [ ] Add more test coverage for page-level components
- [ ] Code-split Shiki language packs to reduce initial bundle size
- [ ] Notifications / activity feed for authenticated users
- [ ] Dark/light theme toggle persistence per-instance
- [ ] Commit `package-lock.json` so `npm ci` can be used in CI for reproducible builds
- [ ] Merge `feature/base` into `main` once stable

---

## Full development history

### Iteration 1 — Initial scaffold and Docker setup
- Scaffolded with Vite 5 + React 18 + TypeScript
- Set up shadcn/ui, Tailwind CSS, React Router v6, TanStack Query v5, Zustand v5
- Could not install Node.js locally (sandbox restriction) — switched entirely to Docker
- Dockerfile: multi-stage build (`node:20-alpine` builder → `nginx:alpine` runner)
- `docker-compose.yml` with port 3000 mapping
- Core API client (`src/api/client.ts`) with typed `fetch` wrapper, `ApiError`, pagination support
- API modules created for: projects, issues, merge requests, pipelines, repository, users, groups, search, todos, wiki
- Auth store (Zustand) with `localStorage` persistence and multi-instance support
- All GitLab types defined in `src/types/gitlab.ts`

### Iteration 2 — Core pages and navigation
- Built all route-level pages: Dashboard, Projects, Groups, Search, Profile, Todos
- Built per-project pages: Repository browser, Issues, MRs, Pipelines, Commits, Compare, Overview, Settings, Wiki, Insights
- `AppLayout` with Sidebar and Topbar
- `ProjectLayout` with per-project tab navigation
- `PrivateRoute` guard redirecting unauthenticated users to `/login`
- Contribution heatmap on Dashboard
- Shiki v1 syntax highlighting (lazy-loaded per language) in `FileViewer`
- Custom diff renderer in `DiffViewer`
- PAT scope detection via `useTokenPermissions` hook
- `PermGate` component to grey out features the token lacks permission for (instead of hiding them)

### Iteration 3 — Bug fixes (blank pages, downloads, redirects)
**Problem**: Repository page loaded briefly then went blank on refresh.
**Fix**: Corrected Radix UI `Select` usage (`SelectGroup`/`SelectLabel`). Used `useParams()['*']` for robust wildcard path extraction. Added error boundary in `ProjectLayout`.

**Problem**: Download source code was not working.
**Fix**: Implemented `fetchBlob()` method in API client. Used `URL.createObjectURL()` for downloads. Earlier attempt embedded token in URL query string — this was a vulnerability and was reverted.

**Problem**: Creating new project and merge requests redirected to GitLab.
**Fix**: Implemented `projects.create` API method and `CreateProjectDialog` component. Implemented `CreateMRDialog` component for in-app MR creation.

**Problem**: Pipeline view showed blank page.
**Fix**: `<SelectItem value="">` caused Radix state to break — changed to `value="all"`. Removed unused destructuring in `PipelineDetail`.

### Iteration 4 — Feature additions (Round 1)
- Removed Issues, Wiki, Overview, To-do tabs from navigation (later Issues was re-added)
- Set Repository as default project tab
- Made recent activity and contribution map on Dashboard clickable/navigatable
- Fixed empty Recent Projects section on Dashboard
- Added ability to create branches from the UI (`CreateBranchDialog`)
- MR listing shows both open and closed MRs (status filter)
- Added Repository Settings page (`src/pages/project/Settings.tsx`)

### Iteration 5 — Git graph
- Implemented custom SVG-based git graph algorithm in `src/utils/gitGraph.ts`
- Renders branch lanes, merge lines, commit nodes with colour-coded branches
- Accessible from the Commits page of any project
- No external graph library — fully custom to avoid large dependencies

### Iteration 6 — Docker and DigitalOcean deployment fixes
**Problem**: DigitalOcean App Platform (Kaniko builder) failed: `touch: /var/run/nginx.pid: No such file or directory`
**Fix (initial)**: Added `mkdir -p /var/run` in Dockerfile.
**Fix (final, during security hardening)**: Moved nginx pid to `/tmp/nginx.pid` in `nginx.conf` — making the `/var/run` workaround unnecessary.

**Problem**: `npm ci` failed in Docker — no `package-lock.json` committed.
**Fix**: Changed Dockerfile to `npm install --legacy-peer-deps`.

**Problem**: TypeScript errors (`TS2322`) on `asChild` prop and `RequestParams` type.
**Fix**: Added `@radix-ui/react-slot`, implemented `asChild` support on `Button`. Broadened `RequestParams` type.

### Iteration 7 — Security audit and hardening
Full audit was performed. Issues found and fixed:

| Severity | Issue | Fix |
|---|---|---|
| Critical | PAT stored as plaintext in `localStorage` | WebCrypto AES-GCM-256 encryption (`src/utils/crypto.ts`), session key in `sessionStorage` |
| Critical | File download embedded token in URL query string | Reverted to `fetchBlob()` + `URL.createObjectURL()` |
| High | No Content Security Policy | Added strict CSP in `nginx-vhost.conf`: `script-src 'self'`, `connect-src 'self' https:`, `object-src 'none'` |
| High | CI job logs rendered raw HTML (ANSI parser) | Replaced custom parser with `ansi-to-html` library (`escapeXML: true`) |
| High | nginx running as root | Added non-root `nginx` user, moved pid/temp to `/tmp` in `nginx.conf` |
| High | `javascript:` URI injectable into href via host input | Added `safeExternalHref()` utility, then later replaced with `new URL(host).origin` approach |
| High | `err.message` from API rendered into DOM | Replaced with hardcoded strings keyed on numeric `err.status` |
| Medium | No HSTS, X-Frame-Options, Referrer-Policy headers | Added all to `nginx-vhost.conf` |
| Medium | Dev server bound to `0.0.0.0` | Changed to `localhost` in `vite.config.ts` |
| Medium | Insecure GitLab host not warned | Added HTTP warning banner on Login page |
| Medium | SVG MIME type wrong (`data:image/svg`) | Fixed to `data:image/svg+xml` |
| Medium | `ref` param not encoded in raw URL | Added `encodeURIComponent` |
| Low | `token` exposed on API client object | Removed from returned object |

Created `SECURITY.md` documenting all controls. Updated README to say "security enforced" rather than listing issues.

### Iteration 8 — Testing (117 tests)
Added full Vitest test suite:
- `vitest.config.ts`, `src/test/setup.ts`
- `src/__tests__/utils/crypto.test.ts` — 16 tests for WebCrypto encrypt/decrypt/storage
- `src/__tests__/utils/url.test.ts` — 33 tests for URL utilities
- `src/__tests__/security/safeHref.test.ts` — 15 tests for `safeExternalHref`
- `src/__tests__/api/client.test.ts` — 19 tests for API client (headers, errors, pagination)
- `src/__tests__/store/auth.test.ts` — 12 tests for Zustand auth store
- `src/__tests__/components/JobLog.test.tsx` — 10 tests (ANSI rendering, XSS safety)
- `src/__tests__/components/Login.test.tsx` — 12 tests (render, insecure warning, submit, errors)

Fixes needed during test setup:
- Installed `@testing-library/dom` (was missing)
- Fixed `getFileExtension('.gitignore')` expectation (`'gitignore'` not `''`)
- Removed duplicate `logDiv` variable in `JobLog.test.tsx`
- Replaced unsupported CSS selector `script[type!="text/javascript"]` with `querySelectorAll('script').length`
- Wrapped `Login` in `QueryClientProvider` to support `useQueryClient()`
- Removed `skype`/`linkedin`/`twitter` from `makeUser` helper (not in `GitLabUser` type)
- Fixed `Uint8Array<ArrayBufferLike>` TypeScript error in `crypto.ts` by using explicit `new ArrayBuffer()`

### Iteration 9 — GitHub Actions CI/CD
Created `.github/workflows/`:
- `ci.yml` — TypeScript check (`tsc --noEmit`), ESLint, Vitest
- `security.yml` — `npm audit`, gitleaks secret scan, GitHub dependency review
- `codeql.yml` — CodeQL static analysis for JS/TS
- `release.yml` — Docker image build and push on semver tag

Fixed ESLint setup:
- Installed `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- Created `eslint.config.js` (ESLint 9 flat config format)
- Disabled React Compiler rules (`purity`, `refs`, `set-state-in-effect`) in `eslint.config.js` as they are too strict without the React Compiler
- Fixed `no-useless-escape` in `CreateProjectDialog.tsx`
- Fixed `@typescript-eslint/no-unused-expressions` in `Commits.tsx`

### Iteration 10 — File upload and inline editor
- `UploadFileDialog` component (`src/components/repository/UploadFileDialog.tsx`): drag-and-drop or file picker, base64 encoding, commit message, branch selection
- `InlineEditor` component (`src/components/repository/InlineEditor.tsx`): textarea editor, commit message, branch selection, save/cancel
- Added `createFile` (POST) and `updateFile` (PUT) to `src/api/repository.ts`
- Integrated both into `Repository.tsx` (upload button) and `FileViewer.tsx` (edit button, gated by `canWriteRepo`)

### Iteration 11 — Guest mode (public repo access without login)
**Goal**: Allow browsing public GitLab repos without requiring a PAT.

Changes:
- `auth.ts`: added `browseAsGuest(host)` action — sets `token: ''`
- `auth.ts`: renamed `localStorage` key from `glab-browser-auth` to `gitlab-browser-auth`
- `PrivateRoute.tsx`: changed `if (!token)` to `if (token === null)` so `token === ''` passes through
- `api/index.ts`: changed `if (!token || !host)` to `if (token === null || !host)` so guest mode creates an API client
- `api/client.ts`: `authHeaders()` function omits `PRIVATE-TOKEN` header when token is falsy
- `Login.tsx`: added "Browse public repositories" card with host input
- `AppLayout.tsx`: amber banner shown in guest mode with Sign in link
- `Topbar.tsx`: shows "Sign in" button instead of avatar in guest mode
- `Dashboard.tsx`: `starredProjects` query gated with `enabled: !!user`; contribution heatmap replaced with sign-in prompt in guest mode
- `Sidebar.tsx`: `queryClient.clear()` called on logout and instance switch to prevent cache bleed

**Bug**: After signing out and signing in as guest, previous user's data was still shown.
**Fix**: Added `queryClient.clear()` to `handleBrowseAsGuest` in `Login.tsx` and `handleLogout` in `Sidebar.tsx`.

**Bug**: Guest mode search returned blank (global `/search` requires auth).
**Fix**: In `Search.tsx`, guest mode projects scope uses `GET /projects?search=...&visibility=public`. Other scopes disabled with lock icon. TypeScript error (`TS2339`) on union type fixed by annotating mapped items as `: GitLabSearchResult`.

### Iteration 12 — Login page animation
- Added `useCursorBlob` hook in `Login.tsx`
- Two blurred gradient blobs follow the cursor using `requestAnimationFrame` + `lerp`
- Primary blob: 8% lerp per frame; secondary blob: 40% of primary movement for depth
- Uses direct DOM style manipulation (not React state) for performance
- Cleaned up with `cancelAnimationFrame` and `removeEventListener` on unmount

### Iteration 13 — CodeQL security fixes (Login.tsx — multiple iterations)

**Round 1**: `safeExternalHref()` added to validate `href` and `img src` attributes.

**Round 2**: Error message sanitisation — `err.message.replace(/<[^>]*>/g, '')` — but CodeQL flagged that `/<[^>]*>/g` doesn't match `<script` without closing `>`.

**Round 3 (final)**: Complete elimination of taint paths:
1. `createTokenHref` — replaced `safeExternalHref(host + ...)` with `new URL(normalizeHost(host)).origin` inside `useMemo`. URL-parser output is not tainted.
2. Error display — replaced all `err.message` usage with hardcoded strings keyed on `err.status` (a number). `ApiError` is checked first; `TypeError` catches network failures; everything else gets a generic message.
3. Avatar `src` — wrapped `instance.user.avatar_url` with `safeExternalHref()`.

### Iteration 14 — README and docs
- README rewritten for public release: self-hosting instructions, Docker quickstart, feature list, screenshots section (6 screenshots), security section ("security enforced"), live demo badge, CI/CodeQL badges
- Renamed project from "glab-browser" to "gitlab-browser" throughout
- Added live demo URL: `https://glabrowser-bchpz.ondigitalocean.app/`
- Created `SECURITY.md` documenting all security controls
- Created `AGENTS.md` (this file) for AI agent handoff
