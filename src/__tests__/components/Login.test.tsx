import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from '../../pages/Login';
import { useAuthStore } from '../../store/auth';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  useAuthStore.setState({ token: null, host: 'https://gitlab.com', user: null, instances: [] });
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Layout / initial render
// ─────────────────────────────────────────────────────────────────────────────
describe('Login — initial render', () => {
  it('shows the GitLab Browser heading', () => {
    renderLogin();
    expect(screen.getByText('GitLab Browser')).toBeInTheDocument();
  });

  it('renders host URL input with default https://gitlab.com', () => {
    renderLogin();
    const hostInput = screen.getByPlaceholderText('https://gitlab.com');
    expect(hostInput).toHaveValue('https://gitlab.com');
  });

  it('renders PAT token input as password type by default', () => {
    renderLogin();
    const tokenInput = screen.getByPlaceholderText(/glpat/i);
    expect(tokenInput).toHaveAttribute('type', 'password');
  });

  it('renders the Sign in button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HTTP insecure-connection warning
// ─────────────────────────────────────────────────────────────────────────────
describe('Login — insecure connection warning', () => {
  it('shows warning when user types an http:// URL', async () => {
    const user = userEvent.setup();
    renderLogin();
    const hostInput = screen.getByPlaceholderText('https://gitlab.com');
    await user.clear(hostInput);
    await user.type(hostInput, 'http://internal.corp');
    expect(screen.getByText(/Insecure connection/i)).toBeInTheDocument();
  });

  it('does NOT show warning for https:// URLs', async () => {
    const user = userEvent.setup();
    renderLogin();
    const hostInput = screen.getByPlaceholderText('https://gitlab.com');
    await user.clear(hostInput);
    await user.type(hostInput, 'https://gitlab.com');
    expect(screen.queryByText(/Insecure connection/i)).not.toBeInTheDocument();
  });

  it('clears warning when user switches back to https://', async () => {
    const user = userEvent.setup();
    renderLogin();
    const hostInput = screen.getByPlaceholderText('https://gitlab.com');
    await user.clear(hostInput);
    await user.type(hostInput, 'http://internal.corp');
    expect(screen.getByText(/Insecure connection/i)).toBeInTheDocument();
    await user.clear(hostInput);
    await user.type(hostInput, 'https://gitlab.com');
    expect(screen.queryByText(/Insecure connection/i)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Token visibility toggle
// ─────────────────────────────────────────────────────────────────────────────
describe('Login — token visibility toggle', () => {
  it('toggles token input to text type when eye icon is clicked', async () => {
    const user = userEvent.setup();
    renderLogin();
    const tokenInput = screen.getByPlaceholderText(/glpat/i);
    expect(tokenInput).toHaveAttribute('type', 'password');
    // The toggle button is next to the token input
    const toggleBtn = tokenInput.parentElement!.querySelector('button')!;
    await user.click(toggleBtn);
    expect(tokenInput).toHaveAttribute('type', 'text');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Form submission — success
// ─────────────────────────────────────────────────────────────────────────────
describe('Login — form submission', () => {
  it('calls the GitLab API and navigates to /dashboard on success', async () => {
    const user = userEvent.setup();
    const fakeUser = {
      id: 1, username: 'alice', name: 'Alice', email: 'alice@example.com',
      avatar_url: '', web_url: '', state: 'active', created_at: '',
      bio: null, location: null, public_email: null,
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve(fakeUser),
      headers: { get: () => null },
    }));
    renderLogin();
    await user.type(screen.getByPlaceholderText(/glpat/i), 'glpat-test-token');
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'));
  });

  it('shows "Invalid token" error on 401 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 401,
      json: () => Promise.resolve({ message: '401 Unauthorized' }),
      headers: { get: () => null },
    }));
    renderLogin();
    await userEvent.setup().type(screen.getByPlaceholderText(/glpat/i), 'bad-token');
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!);
    await waitFor(() =>
      expect(screen.getByText(/Invalid token/i)).toBeInTheDocument()
    );
  });

  it('shows network error message when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderLogin();
    await userEvent.setup().type(screen.getByPlaceholderText(/glpat/i), 'glpat-abc');
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!);
    await waitFor(() =>
      expect(screen.getByText(/cannot reach/i)).toBeInTheDocument()
    );
  });

  it('disables submit button while loading', async () => {
    // Fetch that never resolves — keeps the loading state active
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
    renderLogin();
    await userEvent.setup().type(screen.getByPlaceholderText(/glpat/i), 'glpat-abc');
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /verifying/i })).toBeDisabled()
    );
  });
});
