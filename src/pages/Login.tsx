import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ExternalLink, Loader2, AlertCircle, ShieldAlert, Globe } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { useAuthStore } from '../store/auth';
import { createApiClient } from '../api/client';
import { normalizeHost } from '../utils/url';
import { safeExternalHref } from '../utils/safeHref';
import type { GitLabUser } from '../types/gitlab';

// Smoothly follows the cursor using lerp on each animation frame.
// Returns normalised [0,1] coordinates so the blobs are resolution-independent.
function useCursorBlob() {
  const pos   = useRef({ x: 0.5, y: 0.5 });
  const target = useRef({ x: 0.5, y: 0.5 });
  const frame  = useRef<number>(0);
  const el1    = useRef<HTMLDivElement>(null);
  const el2    = useRef<HTMLDivElement>(null);

  const onMouseMove = useCallback((e: MouseEvent) => {
    target.current = {
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
    };
  }, []);

  useEffect(() => {
    const tick = () => {
      // Primary blob follows at ~8% per frame (smooth)
      pos.current.x += (target.current.x - pos.current.x) * 0.08;
      pos.current.y += (target.current.y - pos.current.y) * 0.08;

      if (el1.current) {
        el1.current.style.transform =
          `translate(${pos.current.x * 100 - 50}%, ${pos.current.y * 100 - 50}%)`;
      }
      // Secondary blob follows slower (25% of primary speed) for depth
      if (el2.current) {
        const x2 = 0.5 + (pos.current.x - 0.5) * 0.4;
        const y2 = 0.5 + (pos.current.y - 0.5) * 0.4;
        el2.current.style.transform =
          `translate(${x2 * 100 - 50}%, ${y2 * 100 - 50}%)`;
      }

      frame.current = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMouseMove);
    frame.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(frame.current);
    };
  }, [onMouseMove]);

  return { el1, el2 };
}

export default function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const isAddInstance = searchParams.get('add') === '1';
  const { el1: blob1, el2: blob2 } = useCursorBlob();

  const { setAuth, setUser, browseAsGuest, instances } = useAuthStore();

  const [host, setHost] = useState('https://gitlab.com');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [guestHost, setGuestHost] = useState('https://gitlab.com');

  const handleBrowseAsGuest = () => {
    const normalizedHost = normalizeHost(guestHost);
    browseAsGuest(normalizedHost);
    // Clear the cache so a previously authenticated user's data is not
    // shown while browsing as an unauthenticated guest.
    queryClient.clear();
    navigate('/dashboard');
  };

  // Only show the "Create token" link when `host` resolves to a safe http/https URL.
  // This prevents a javascript: URI typed into the host field from being placed
  // into an href attribute (high-severity DOM XSS vector).
  const createTokenHref = safeExternalHref(
    `${host}/-/user_settings/personal_access_tokens?name=gitlab-browser&scopes=read_api,read_repository`
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const normalizedHost = normalizeHost(host);

    try {
      const client = createApiClient({ host: normalizedHost, token });
      const user = await client.request<GitLabUser>('/user');

      setAuth(token, normalizedHost);
      setUser(user);

      navigate('/dashboard');
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('401') || err.message.includes('Unauthorized')) {
          setError('Invalid token. Please check your Personal Access Token and try again.');
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          // Do not interpolate user-supplied host into the error string —
          // use a fixed message to avoid tainted data flowing into the DOM.
          setError('Cannot reach the specified host. Check the URL and your network connection.');
        } else {
          // Strip HTML tags from API-sourced error messages before displaying.
          // React text nodes are auto-escaped, but explicit sanitisation
          // eliminates the static-analysis taint path from network → DOM.
          setError(err.message.replace(/<[^>]*>/g, '').slice(0, 300));
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden">

      {/* ── Animated background ── */}

      {/* Dot-grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Static accent ring — top-right */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full border border-primary/10 opacity-60" />
      <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full border border-primary/10 opacity-40" />

      {/* Static accent ring — bottom-left */}
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full border border-primary/10 opacity-60" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full border border-primary/10 opacity-40" />

      {/* Primary cursor blob */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div
          ref={blob1}
          className="h-[600px] w-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary)/0.18) 0%, transparent 70%)',
            filter: 'blur(48px)',
            willChange: 'transform',
          }}
        />
      </div>

      {/* Secondary (offset) blob for depth */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div
          ref={blob2}
          className="h-[400px] w-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary)/0.10) 0%, transparent 70%)',
            filter: 'blur(64px)',
            willChange: 'transform',
          }}
        />
      </div>

      {/* ── Page content ── */}
      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 24 24" fill="white" className="h-10 w-10">
              <path d="M12 2L2 19h20L12 2zm0 3.5L18.5 17h-13L12 5.5z" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">GitLab Browser</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAddInstance ? 'Add another GitLab instance' : 'Sign in with your Personal Access Token'}
            </p>
          </div>
        </div>

        {/* Switch between existing instances */}
        {!isAddInstance && instances.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent instances</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {instances.map((instance) => (
                <button
                  key={instance.host}
                  onClick={() => {
                    queryClient.clear();
                    useAuthStore.getState().switchInstance(instance.host);
                    navigate('/dashboard');
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                >
                  <img
                    src={safeExternalHref(instance.user.avatar_url) ?? ''}
                    alt={instance.user.name}
                    className="h-8 w-8 rounded-full"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{instance.user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{instance.user.username} · {instance.host.replace('https://', '')}
                    </p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Login form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isAddInstance || instances.length === 0 ? 'Connect to GitLab' : 'Or connect a new instance'}
            </CardTitle>
            <CardDescription>
              Enter your GitLab host URL and a Personal Access Token with{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">read_api</code> scope.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="host">GitLab Host URL</Label>
                <Input
                  id="host"
                  type="url"
                  placeholder="https://gitlab.com"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  required
                />
                {host.trimStart().startsWith('http://') && (
                  <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs">
                    <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      <strong>Insecure connection:</strong> your Personal Access Token will be
                      transmitted unencrypted. Use <code>https://</code> unless this is an isolated
                      internal network.
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Use <code>https://gitlab.com</code> or your self-hosted instance URL
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="token">Personal Access Token</Label>
                  {createTokenHref && (
                    <a
                      href={createTokenHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Create token
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="token"
                    type={showToken ? 'text' : 'password'}
                    placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required
                    className="pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your token is stored locally and never sent to any server other than your GitLab instance.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Required scopes info */}
        <Card className="bg-muted/50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground font-medium mb-2">Required token scopes:</p>
            <div className="flex flex-wrap gap-1.5">
              {['read_api', 'read_repository'].map((scope) => (
                <code key={scope} className="text-xs bg-background border border-border rounded px-1.5 py-0.5">
                  {scope}
                </code>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Add <code className="bg-background border border-border rounded px-1 py-0.5">write_repository</code> to
              enable creating issues, merge requests, and comments.
            </p>
          </CardContent>
        </Card>

        {/* Guest / public access */}
        {!isAddInstance && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>
        )}

        {!isAddInstance && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Browse public repositories
              </CardTitle>
              <CardDescription>
                Explore public projects on GitLab without a token. Write actions and private repos will be unavailable.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              <div className="space-y-1.5">
                <Label htmlFor="guest-host" className="text-xs">GitLab instance</Label>
                <Input
                  id="guest-host"
                  type="url"
                  placeholder="https://gitlab.com"
                  value={guestHost}
                  onChange={(e) => setGuestHost(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleBrowseAsGuest}
              >
                <Globe className="h-4 w-4 mr-2" />
                Browse without signing in
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
