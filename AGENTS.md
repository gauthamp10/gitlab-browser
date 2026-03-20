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

## Development history summary

Key decisions and fixes made during development (in order):

- Scaffolded with Vite + React + TypeScript, containerised with Docker multi-stage build
- Fixed blank repository page — caused by incorrect Radix UI `Select` usage and fragile path extraction via `useParams`
- Implemented in-app MR creation, project creation, branch creation — all were previously redirecting to GitLab
- File downloads use `fetchBlob()` + `URL.createObjectURL()` — never embed token in URLs
- Pipeline blank page fixed — `SelectItem` had `value=""` which broke Radix state
- Git graph implemented as custom SVG algorithm in `src/utils/gitGraph.ts`
- Full security audit: WebCrypto PAT encryption, CSP headers, ANSI log sanitisation, nginx non-root hardening, `safeExternalHref` utility
- CodeQL taint fixes in `Login.tsx`: use `err.status` (number) not `err.message` (string) for error display; use `new URL(host).origin` not raw `host` for href construction
- Guest mode: `token === ''` (not null) passes through `PrivateRoute`; `ApiProvider` creates client when `token !== null`; search falls back to `/projects?search=...&visibility=public` for unauthenticated access
- 117 Vitest tests added across utils, API client, store, and components
- GitHub Actions: `ci.yml`, `security.yml`, `codeql.yml`, `release.yml`
