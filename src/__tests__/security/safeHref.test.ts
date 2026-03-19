import { describe, it, expect } from 'vitest';
import { safeExternalHref } from '../../utils/safeHref';

/**
 * safeExternalHref guards every API-supplied URL before it is placed in an
 * <a href> attribute.  A compromised GitLab instance could return
 * `javascript:` URIs to achieve XSS when a user clicks a link.
 */
describe('safeExternalHref — allowed protocols', () => {
  it('passes through https:// URLs unchanged', () => {
    expect(safeExternalHref('https://gitlab.com/group/project')).toBe(
      'https://gitlab.com/group/project'
    );
  });

  it('passes through http:// URLs (with implicit insecure-connection caveat)', () => {
    expect(safeExternalHref('http://internal.corp/project')).toBe(
      'http://internal.corp/project'
    );
  });

  it('passes through URLs with query strings and fragments', () => {
    const url = 'https://gitlab.com/issues?state=open#note-1';
    expect(safeExternalHref(url)).toBe(url);
  });
});

describe('safeExternalHref — blocked protocols (XSS vectors)', () => {
  it('blocks javascript: URIs', () => {
    expect(safeExternalHref('javascript:alert(document.cookie)')).toBeUndefined();
  });

  it('blocks javascript: with mixed case', () => {
    expect(safeExternalHref('JavaScript:alert(1)')).toBeUndefined();
  });

  it('blocks data: URIs', () => {
    expect(safeExternalHref('data:text/html,<script>alert(1)</script>')).toBeUndefined();
  });

  it('blocks vbscript: URIs', () => {
    expect(safeExternalHref('vbscript:msgbox(1)')).toBeUndefined();
  });

  it('blocks ftp:// URLs (not useful for navigation here)', () => {
    expect(safeExternalHref('ftp://files.example.com')).toBeUndefined();
  });

  it('blocks blob: URLs', () => {
    expect(safeExternalHref('blob:https://example.com/some-id')).toBeUndefined();
  });
});

describe('safeExternalHref — invalid / empty input', () => {
  it('returns undefined for null', () => {
    expect(safeExternalHref(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(safeExternalHref(undefined)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(safeExternalHref('')).toBeUndefined();
  });

  it('returns undefined for relative paths', () => {
    expect(safeExternalHref('/group/project')).toBeUndefined();
  });

  it('returns undefined for bare hostnames (not valid URLs)', () => {
    expect(safeExternalHref('gitlab.com/project')).toBeUndefined();
  });

  it('returns undefined for whitespace-only strings', () => {
    expect(safeExternalHref('   ')).toBeUndefined();
  });
});
