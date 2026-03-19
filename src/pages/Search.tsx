import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, FolderOpen, AlertCircle, GitPullRequest, GitCommit, FileCode } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import EmptyState from '../components/common/EmptyState';
import { useApi } from '../api';
import type { SearchScope } from '../api/search';

const SCOPES: Array<{ value: SearchScope; label: string; icon: React.ElementType }> = [
  { value: 'projects', label: 'Projects', icon: FolderOpen },
  { value: 'issues', label: 'Issues', icon: AlertCircle },
  { value: 'merge_requests', label: 'Merge Requests', icon: GitPullRequest },
  { value: 'commits', label: 'Commits', icon: GitCommit },
  { value: 'blobs', label: 'Code', icon: FileCode },
];

export default function Search() {
  const api = useApi();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [scope, setScope] = useState<SearchScope>('projects');

  const q = searchParams.get('q') ?? '';

  useEffect(() => {
    setQuery(q);
  }, [q]);

  const { data, isLoading } = useQuery({
    queryKey: ['search', scope, q],
    queryFn: () => api.search.global(scope, q, { per_page: 20 }),
    enabled: q.length > 1,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Search</h1>

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search GitLab…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {q && (
        <>
          {/* Scope tabs */}
          <div className="flex gap-1 flex-wrap">
            {SCOPES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setScope(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  scope === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Results */}
          <div className="space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-2">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))
            ) : !data?.items.length ? (
              <EmptyState
                icon={<SearchIcon className="h-8 w-8" />}
                title="No results found"
                description={`No ${scope} found for "${q}".`}
              />
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {data.items.length}+ results for "{q}"
                </p>
                {data.items.map((result) => (
                  <div key={result.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                    {scope === 'projects' && (
                      <Link to={`/projects/${result.id}`} className="space-y-1">
                        <p className="font-medium hover:text-primary transition-colors">{result.title || `Project #${result.id}`}</p>
                        {result.description && <p className="text-sm text-muted-foreground line-clamp-1">{result.description}</p>}
                      </Link>
                    )}
                    {scope === 'issues' && (
                      <a href={result.web_url} target="_blank" rel="noopener noreferrer" className="space-y-1 block">
                        <div className="flex items-center gap-2">
                          <Badge variant={result.state === 'opened' ? 'success' : 'secondary'} className="text-xs">
                            {result.state}
                          </Badge>
                          <p className="font-medium hover:text-primary transition-colors">{result.title}</p>
                        </div>
                        {result.description && <p className="text-sm text-muted-foreground line-clamp-1">{result.description}</p>}
                      </a>
                    )}
                    {scope === 'merge_requests' && (
                      <a href={result.web_url} target="_blank" rel="noopener noreferrer" className="space-y-1 block">
                        <div className="flex items-center gap-2">
                          <Badge variant={result.state === 'opened' ? 'info' : result.state === 'merged' ? 'success' : 'secondary'} className="text-xs">
                            {result.state}
                          </Badge>
                          <p className="font-medium hover:text-primary transition-colors">{result.title}</p>
                        </div>
                      </a>
                    )}
                    {scope === 'commits' && (
                      <div className="space-y-1">
                        <p className="font-medium font-mono text-sm">{String(result.id).slice(0, 8)}</p>
                        <p className="text-sm">{result.title}</p>
                        <p className="text-xs text-muted-foreground">{result.data}</p>
                      </div>
                    )}
                    {scope === 'blobs' && (
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{result.filename}</p>
                        <p className="text-xs text-muted-foreground">{result.path}</p>
                        {result.data && (
                          <code className="block text-xs bg-muted p-2 rounded font-mono line-clamp-3 whitespace-pre-wrap">
                            {result.data}
                          </code>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {!q && (
        <EmptyState
          icon={<SearchIcon className="h-8 w-8" />}
          title="Search GitLab"
          description="Search for projects, issues, merge requests, commits, and code across all your GitLab instances."
        />
      )}
    </div>
  );
}
