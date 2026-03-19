/**
 * Validates that a URL from external data (e.g. GitLab API) uses a safe
 * protocol before it is placed in an href attribute.
 *
 * Without this check, a malicious GitLab instance could return
 * `javascript:alert(document.cookie)` as a `web_url` or `target_url` field,
 * which would execute in the page's origin when clicked.
 *
 * Only http: and https: are considered safe for external navigation links.
 */
export function safeExternalHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return url;
    }
    return undefined;
  } catch {
    return undefined;
  }
}
