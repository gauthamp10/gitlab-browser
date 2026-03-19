import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { useAuthStore } from '../store/auth';
import { createApiClient } from '../api/client';
import { normalizeHost } from '../utils/url';
import type { GitLabUser } from '../types/gitlab';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAddInstance = searchParams.get('add') === '1';

  const { setAuth, setUser, instances } = useAuthStore();

  const [host, setHost] = useState('https://gitlab.com');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          setError(`Cannot reach ${host}. Check the host URL and your network connection.`);
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
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
                    useAuthStore.getState().switchInstance(instance.host);
                    navigate('/dashboard');
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                >
                  <img
                    src={instance.user.avatar_url}
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
                <p className="text-xs text-muted-foreground">
                  Use <code>https://gitlab.com</code> or your self-hosted instance URL
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="token">Personal Access Token</Label>
                  <a
                    href={`${host}/-/user_settings/personal_access_tokens?name=glab-browser&scopes=read_api,read_repository`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Create token
                    <ExternalLink className="h-3 w-3" />
                  </a>
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
      </div>
    </div>
  );
}
