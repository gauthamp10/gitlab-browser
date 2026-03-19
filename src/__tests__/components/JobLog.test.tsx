import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import JobLog from '../../components/pipelines/JobLog';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function renderJobLog(logText: string, status: 'success' | 'running' | 'failed' = 'success') {
  const fetchLog = vi.fn().mockResolvedValue(logText);
  render(
    <JobLog
      projectId={1}
      jobId={42}
      status={status}
      fetchLog={fetchLog}
    />
  );
  return { fetchLog };
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading / error states
// ─────────────────────────────────────────────────────────────────────────────
describe('JobLog — states', () => {
  it('shows a loading indicator initially', () => {
    renderJobLog('some log');
    expect(screen.getByText(/loading log/i)).toBeInTheDocument();
  });

  it('renders the log text after fetch resolves', async () => {
    renderJobLog('Build successful');
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/Build successful/)).toBeInTheDocument();
  });

  it('shows "No output available" for an empty log', async () => {
    renderJobLog('');
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/No output available/i)).toBeInTheDocument();
  });

  it('shows error message when fetch rejects', async () => {
    const fetchLog = vi.fn().mockRejectedValue(new Error('Network error'));
    render(<JobLog projectId={1} jobId={1} status="failed" fetchLog={fetchLog} />);
    await waitFor(() => expect(screen.getByText(/Network error/)).toBeInTheDocument());
  });

  it('shows the job ID in the header', async () => {
    renderJobLog('log', 'success');
    expect(screen.getByText(/Job #42/)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// XSS prevention — HTML in log output must be escaped
// ─────────────────────────────────────────────────────────────────────────────
describe('JobLog — XSS safety (ansi-to-html with escapeXML: true)', () => {
  it('escapes <script> tags in log output', async () => {
    renderJobLog('<script>alert(document.cookie)</script>');
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // The text should be visible as escaped content, no live script nodes
    const logDiv = document.querySelector('.whitespace-pre-wrap');
    expect(logDiv?.querySelectorAll('script').length).toBe(0);
    expect(logDiv?.innerHTML).toContain('&lt;script&gt;');
    expect(logDiv?.innerHTML).not.toContain('<script>alert');
  });

  it('escapes HTML injection via img onerror', async () => {
    renderJobLog('<img src=x onerror=alert(1)>');
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    const logDiv = document.querySelector('.whitespace-pre-wrap');
    expect(logDiv?.innerHTML).toContain('&lt;img');
    expect(logDiv?.innerHTML).not.toContain('<img src=x');
  });

  it('escapes ampersands', async () => {
    renderJobLog('curl https://example.com?a=1&b=2');
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    const logDiv = document.querySelector('.whitespace-pre-wrap');
    expect(logDiv?.innerHTML).toContain('&amp;');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ANSI colour rendering
// ─────────────────────────────────────────────────────────────────────────────
describe('JobLog — ANSI rendering', () => {
  it('converts ANSI red colour code to a span with colour style', async () => {
    // ESC[31m = red foreground
    renderJobLog('\x1b[31mERROR: build failed\x1b[0m');
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    const logDiv = document.querySelector('.whitespace-pre-wrap');
    // Should contain a coloured span from ansi-to-html
    expect(logDiv?.innerHTML).toContain('<span');
    expect(logDiv?.innerHTML).toContain('color:');
  });

  it('renders plain text without ANSI codes correctly', async () => {
    renderJobLog('Step 1 of 3: installing dependencies');
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/Step 1 of 3/)).toBeInTheDocument();
  });
});
