import { describe, it, expect } from 'vitest';
import {
  normalizeHost,
  encodeFilePath,
  encodeBranch,
  encodeProjectId,
  getFileExtension,
  getLanguageFromExtension,
  isValidUrl,
  buildQueryString,
} from '../../utils/url';

// ─────────────────────────────────────────────────────────────────────────────
// normalizeHost
// ─────────────────────────────────────────────────────────────────────────────
describe('normalizeHost', () => {
  it('prepends https:// when no protocol is given', () => {
    expect(normalizeHost('gitlab.com')).toBe('https://gitlab.com');
  });

  it('strips trailing slash', () => {
    expect(normalizeHost('https://gitlab.com/')).toBe('https://gitlab.com');
  });

  it('trims whitespace', () => {
    expect(normalizeHost('  https://gitlab.com  ')).toBe('https://gitlab.com');
  });

  it('preserves https:// when already present', () => {
    expect(normalizeHost('https://self-hosted.example.com')).toBe('https://self-hosted.example.com');
  });

  it('preserves http:// when explicitly provided', () => {
    // http:// is allowed but triggers a warning in the UI
    expect(normalizeHost('http://internal.corp')).toBe('http://internal.corp');
  });

  it('handles host with path prefix', () => {
    expect(normalizeHost('https://example.com/gitlab')).toBe('https://example.com/gitlab');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// encodeFilePath
// ─────────────────────────────────────────────────────────────────────────────
describe('encodeFilePath', () => {
  it('encodes path segments and joins with %2F', () => {
    expect(encodeFilePath('src/utils/url.ts')).toBe('src%2Futils%2Furl.ts');
  });

  it('encodes spaces in file names', () => {
    expect(encodeFilePath('my folder/my file.txt')).toBe('my%20folder%2Fmy%20file.txt');
  });

  it('encodes special characters', () => {
    expect(encodeFilePath('config/app+config.json')).toBe('config%2Fapp%2Bconfig.json');
  });

  it('handles single segment with no slashes', () => {
    expect(encodeFilePath('README.md')).toBe('README.md');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// encodeBranch
// ─────────────────────────────────────────────────────────────────────────────
describe('encodeBranch', () => {
  it('encodes slashes in branch names', () => {
    expect(encodeBranch('feature/my-feature')).toBe('feature%2Fmy-feature');
  });

  it('encodes spaces', () => {
    expect(encodeBranch('my branch')).toBe('my%20branch');
  });

  it('leaves simple branch names unchanged', () => {
    expect(encodeBranch('main')).toBe('main');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// encodeProjectId
// ─────────────────────────────────────────────────────────────────────────────
describe('encodeProjectId', () => {
  it('converts number to string', () => {
    expect(encodeProjectId(42)).toBe('42');
  });

  it('encodes namespaced project paths', () => {
    expect(encodeProjectId('group/project')).toBe('group%2Fproject');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getFileExtension
// ─────────────────────────────────────────────────────────────────────────────
describe('getFileExtension', () => {
  it('returns lowercase extension', () => {
    expect(getFileExtension('App.TSX')).toBe('tsx');
  });

  it('returns extension for dotted filename', () => {
    expect(getFileExtension('index.test.ts')).toBe('ts');
  });

  it('returns the text after the dot for dotfiles (e.g. .gitignore → gitignore)', () => {
    // .gitignore splits to ['', 'gitignore'] — parts.length > 1 → returns 'gitignore'
    expect(getFileExtension('.gitignore')).toBe('gitignore');
  });

  it('returns empty string for files with no extension', () => {
    expect(getFileExtension('Makefile')).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getLanguageFromExtension
// ─────────────────────────────────────────────────────────────────────────────
describe('getLanguageFromExtension', () => {
  it('maps ts → typescript', () => {
    expect(getLanguageFromExtension('ts')).toBe('typescript');
  });

  it('maps py → python', () => {
    expect(getLanguageFromExtension('py')).toBe('python');
  });

  it('maps yml and yaml → yaml', () => {
    expect(getLanguageFromExtension('yml')).toBe('yaml');
    expect(getLanguageFromExtension('yaml')).toBe('yaml');
  });

  it('returns text for unknown extensions', () => {
    expect(getLanguageFromExtension('xyz')).toBe('text');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isValidUrl
// ─────────────────────────────────────────────────────────────────────────────
describe('isValidUrl', () => {
  it('returns true for https URLs', () => {
    expect(isValidUrl('https://gitlab.com')).toBe(true);
  });

  it('returns true for http URLs', () => {
    expect(isValidUrl('http://internal.corp')).toBe(true);
  });

  it('returns false for bare hostnames', () => {
    expect(isValidUrl('gitlab.com')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidUrl('')).toBe(false);
  });

  it('returns false for random text', () => {
    expect(isValidUrl('not a url at all')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildQueryString
// ─────────────────────────────────────────────────────────────────────────────
describe('buildQueryString', () => {
  it('returns empty string when all values are absent', () => {
    expect(buildQueryString({ a: undefined, b: null, c: '' })).toBe('');
  });

  it('builds query string from defined values', () => {
    expect(buildQueryString({ page: 1, per_page: 20 })).toBe('?page=1&per_page=20');
  });

  it('omits undefined and null values', () => {
    expect(buildQueryString({ state: 'open', search: null })).toBe('?state=open');
  });

  it('URL-encodes values with special characters', () => {
    const qs = buildQueryString({ search: 'hello world' });
    expect(qs).toBe('?search=hello%20world');
  });

  it('encodes boolean values', () => {
    expect(buildQueryString({ membership: true })).toBe('?membership=true');
  });
});
