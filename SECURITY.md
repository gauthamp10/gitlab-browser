# Security

This document describes the security controls implemented in **glab-browser**.

---

## Token Storage — WebCrypto AES-GCM Encryption

PATs are **never written to `localStorage` in plaintext**.

When the application first starts in a browser session it generates a fresh
256-bit AES-GCM key via `crypto.subtle.generateKey` and exports it to JWK
format in **`sessionStorage`**. All state that is persisted to `localStorage`
(active token plus tokens for every registered GitLab instance) is encrypted
with a random 12-byte nonce before being written. The stored payload looks like:

```json
{ "v": 1, "iv": "<base64-nonce>", "ct": "<base64-ciphertext>" }
```

**Key lifecycle:**
- The encryption key lives exclusively in `sessionStorage`, which is cleared
  automatically when the browser session ends (tab/window close, restart).
- After a browser restart the key is gone; `localStorage` blobs cannot be
  decrypted, so the user is prompted to re-authenticate.
- Within a session, page refreshes work seamlessly.

**Implementation:** `src/utils/crypto.ts` — `encrypt()`, `decrypt()`, and the
`encryptedLocalStorage` adapter wired to Zustand's `persist` middleware via
`createJSONStorage`.

---

## Token Transmission

PATs are transmitted **exclusively via the `PRIVATE-TOKEN` HTTP request header**.

Archive downloads previously used a `?private_token=` query parameter, which
exposed the token in browser history, nginx access logs (`$request`), and
`Referer` headers. This was replaced with an authenticated `fetch` +
`URL.createObjectURL` approach — the token never appears in a URL.

---

## Content Security Policy

```
default-src 'self';
script-src  'self';                        ← no unsafe-inline
style-src   'self' 'unsafe-inline';        ← Tailwind/Radix runtime styles only
img-src     'self' data: https: blob:;
font-src    'self' data:;
connect-src 'self' https:;                 ← plaintext http: blocked
media-src   'self';
object-src  'none';
base-uri    'self';
form-action 'self';
```

`script-src 'self'` (no `unsafe-inline`) means injected inline scripts cannot
execute. `connect-src https:` ensures tokens cannot be sent over an unencrypted
connection even if a user enters an `http://` host — a visible warning is also
shown in the UI in that case.

---

## HTTP Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Enforce HTTPS for 1 year |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `X-Frame-Options` | `SAMEORIGIN` | Prevent clickjacking |
| `X-XSS-Protection` | `0` | Disable the broken legacy browser XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit Referer exposure |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` | Restrict browser feature access |

---

## CI Job Log Rendering

CI pipeline job logs contain ANSI escape sequences written by developer-controlled
scripts. Log rendering uses [`ansi-to-html`](https://www.npmjs.com/package/ansi-to-html)
with `escapeXML: true`, which HTML-entity-escapes all content before converting
ANSI codes. This ensures that characters like `<`, `>`, and `&` in log output
cannot be interpreted as HTML even when injected via `dangerouslySetInnerHTML`.

---

## Docker / nginx Hardening

- nginx runs as a **non-root user** (`USER nginx` in the Dockerfile)
- The custom global `nginx.conf` has no `user` directive, sets `pid /tmp/nginx.pid`,
  and redirects all temp paths to `/tmp` — no writable root-owned directories needed
- `server_tokens off` hides the nginx version from response headers
- A `/health` endpoint is provided for container health checks

---

## Development Server

The Vite dev server and preview server are bound to `localhost` only
(`host: 'localhost'` in `vite.config.ts`), preventing accidental exposure on
shared or corporate networks.

---

## Insecure Host Warning

If a user enters a GitLab host URL beginning with `http://`, the login form
displays a prominent amber warning:

> **Insecure connection:** your Personal Access Token will be transmitted
> unencrypted. Use `https://` unless this is an isolated internal network.

The CSP `connect-src https:` directive provides a second layer of enforcement
in browsers that respect it.

---

## Reporting a Vulnerability

Please **do not open a public GitHub issue** for security reports.

Use GitHub's private advisory feature:  
**`Security` → `Report a vulnerability`** on the repository page.

Include a description, reproduction steps, potential impact, and any suggested
remediation. We aim to acknowledge reports within 48 hours and provide a fix
within 14 days for critical and high severity issues.
