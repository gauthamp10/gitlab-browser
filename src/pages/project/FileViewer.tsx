import { useOutletContext, useParams, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { Skeleton } from '../../components/ui/skeleton';
import FileViewerComponent from '../../components/code/FileViewer';
import ErrorMessage from '../../components/common/ErrorMessage';
import { useApi } from '../../api';
import { getFileExtension, getLanguageFromExtension } from '../../utils/url';
import { formatFileSize } from '../../utils/format';
import type { GitLabProject } from '../../types/gitlab';

interface OutletContext {
  project: GitLabProject;
}

export default function FileViewer() {
  const { id } = useParams<{ id: string }>();
  const { project } = useOutletContext<OutletContext>();
  const location = useLocation();
  const api = useApi();

  // Extract file path from URL: /projects/:id/repository/blob/:path
  const blobBase = `/projects/${id}/repository/blob/`;
  const filePath = location.pathname.startsWith(blobBase)
    ? decodeURIComponent(location.pathname.slice(blobBase.length))
    : '';

  // Get ref from query string, default to default branch
  const searchParams = new URLSearchParams(location.search);
  const ref = searchParams.get('ref') || project.default_branch || 'main';

  const { data: file, isLoading, error, refetch } = useQuery({
    queryKey: ['project', id, 'file', filePath, ref],
    queryFn: () => api.repository.getFile(Number(id), filePath, ref),
    enabled: !!filePath,
  });

  const ext = getFileExtension(filePath.split('/').pop() ?? filePath);
  const language = getLanguageFromExtension(ext);

  const pathParts = filePath.split('/');
  const parentPath = pathParts.slice(0, -1).join('/');

  // Decode base64 content safely
  const content = (() => {
    if (!file) return '';
    try {
      return atob(file.content.replace(/\n/g, ''));
    } catch {
      return file.content;
    }
  })();

  // Detect if binary
  const isBinary = file && (
    file.encoding !== 'base64' ||
    (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp'].includes(ext))
  );

  const rawUrl = file
    ? `${api.client.base}/projects/${id}/repository/files/${encodeURIComponent(filePath)}/raw?ref=${ref}`
    : undefined;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm flex-wrap">
        <Link to={`/projects/${id}/repository`} className="text-primary hover:underline font-medium">
          {project.name}
        </Link>
        {pathParts.map((part, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            {i < pathParts.length - 1 ? (
              <Link
                to={`/projects/${id}/repository/tree/${pathParts.slice(0, i + 1).join('/')}`}
                className="text-primary hover:underline"
              >
                {part}
              </Link>
            ) : (
              <span className="text-foreground font-medium">{part}</span>
            )}
          </span>
        ))}
      </div>

      {/* Back button */}
      <Link
        to={parentPath
          ? `/projects/${id}/repository/tree/${parentPath}`
          : `/projects/${id}/repository`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {parentPath ? pathParts[pathParts.length - 2] : project.name}
      </Link>

      {isLoading ? (
        <div className="border rounded-lg p-4 space-y-2">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="h-4" style={{ width: `${50 + Math.random() * 50}%` }} />
          ))}
        </div>
      ) : error ? (
        <ErrorMessage error={error as Error} onRetry={() => refetch()} />
      ) : file ? (
        isBinary ? (
          <div className="border rounded-lg p-8 text-center">
            {['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) ? (
              <img
                src={`data:image/${ext};base64,${file.content}`}
                alt={filePath}
                className="max-w-full max-h-[600px] mx-auto rounded-lg"
              />
            ) : (
              <div className="space-y-3">
                <p className="text-muted-foreground">Binary file: {file.file_name}</p>
                <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                {rawUrl && (
                  <a
                    href={rawUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    Download file
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <FileViewerComponent
            content={content}
            language={language}
            filename={file.file_name}
            rawUrl={rawUrl}
          />
        )
      ) : null}
    </div>
  );
}
