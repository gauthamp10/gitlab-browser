import { useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ChevronRight, FileText } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import EmptyState from '../../components/common/EmptyState';
import { useApi } from '../../api';
import type { GitLabProject } from '../../types/gitlab';

interface OutletContext { project: GitLabProject }

export default function Wiki() {
  const { id } = useParams<{ id: string }>();
  const { project } = useOutletContext<OutletContext>();
  const api = useApi();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const { data: pages, isLoading: loadingPages } = useQuery({
    queryKey: ['project', id, 'wiki'],
    queryFn: () => api.wiki.list(Number(id)),
    enabled: !!id,
  });

  const { data: page, isLoading: loadingPage } = useQuery({
    queryKey: ['project', id, 'wiki', 'page', selectedSlug],
    queryFn: () => api.wiki.get(Number(id), selectedSlug!),
    enabled: !!selectedSlug,
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Wiki
        </h2>
        <Button variant="outline" size="sm" asChild>
          <a href={`${project.web_url}/-/wikis/new`} target="_blank" rel="noopener noreferrer">
            New page
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Pages list */}
        <div className="lg:col-span-1">
          <div className="border rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-muted/50 border-b text-sm font-medium">Pages</div>
            {loadingPages ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-7" />)}
              </div>
            ) : !pages?.length ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No wiki pages</div>
            ) : (
              <div className="divide-y">
                {pages.map((p) => (
                  <button
                    key={p.slug}
                    onClick={() => setSelectedSlug(p.slug)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted/50 transition-colors ${
                      selectedSlug === p.slug ? 'bg-primary/10 text-primary' : 'text-foreground'
                    }`}
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate">{p.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Page content */}
        <div className="lg:col-span-3">
          {!selectedSlug ? (
            <EmptyState
              icon={<BookOpen className="h-8 w-8" />}
              title="Select a page"
              description="Choose a wiki page from the list on the left to view its content."
            />
          ) : loadingPage ? (
            <div className="border rounded-lg p-6 space-y-3">
              <Skeleton className="h-7 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : page ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="px-6 py-3 border-b bg-muted/30 flex items-center gap-2 text-sm text-muted-foreground">
                <ChevronRight className="h-4 w-4" />
                <span className="font-medium text-foreground">{page.title}</span>
              </div>
              <div className="p-6 markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{page.content}</ReactMarkdown>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
