import { useState } from 'react';
import { useOutletContext, useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ArrowLeft, Pencil } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import FileViewerComponent from '../../components/code/FileViewer';
import InlineEditor from '../../components/repository/InlineEditor';
import ErrorMessage from '../../components/common/ErrorMessage';
import PermGate from '../../components/common/PermGate';
import { useApi } from '../../api';
import { useTokenPermissions } from '../../hooks/useTokenPermissions';
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
  const navigate = useNavigate();
  const api = useApi();
  const queryClient = useQueryClient();
  const { canWriteRepo } = useTokenPermissions();
  const [isEditing, setIsEditing] = useState(false);

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

  const handleSave = async ({
    content: newContent,
    commitMessage,
    branch: targetBranch,
  }: { content: string; commitMessage: string; branch: string }) => {
    // Encode to base64 so non-ASCII characters are preserved
    const encoded = btoa(unescape(encodeURIComponent(newContent)));
    await api.repository.updateFile(Number(id), filePath, {
      branch: targetBranch,
      content: encoded,
      commit_message: commitMessage,
      last_commit_id: file?.last_commit_id,
      encoding: 'base64',
    });
    // Refresh the file query so the viewer shows the updated content
    await queryClient.invalidateQueries({ queryKey: ['project', id, 'file', filePath] });
    setIsEditing(false);
    // If the user committed to a different branch, navigate with that ref
    if (targetBranch !== ref) {
      navigate(`${location.pathname}?ref=${encodeURIComponent(targetBranch)}`);
    }
  };

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

      {/* Back button + Edit action */}
      <div className="flex items-center justify-between">
        <Link
          to={parentPath
            ? `/projects/${id}/repository/tree/${parentPath}`
            : `/projects/${id}/repository`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {parentPath ? pathParts[pathParts.length - 2] : project.name}
        </Link>

        {file && !isBinary && !isEditing && (
          <PermGate
            allowed={canWriteRepo}
            reason='Requires "api" or "write_repository" scope to edit files'
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              disabled={!canWriteRepo}
              className="gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </PermGate>
        )}
      </div>

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
                src={`data:${({ svg: 'image/svg+xml', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' } as Record<string, string>)[ext] ?? 'application/octet-stream'};base64,${file.content}`}
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
        ) : isEditing ? (
          <InlineEditor
            filename={file.file_name}
            initialContent={content}
            branch={ref}
            lastCommitId={file.last_commit_id}
            onSave={handleSave}
            onCancel={() => setIsEditing(false)}
          />
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
