import { useState } from 'react';
import { Copy, Check, ExternalLink, Hash } from 'lucide-react';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { useShiki } from '../../hooks/useShiki';
import { useSettingsStore } from '../../store/settings';
import { cn } from '../../utils/cn';

interface FileViewerProps {
  content: string;
  language: string;
  filename: string;
  rawUrl?: string;
  className?: string;
}

export default function FileViewer({ content, language, filename, rawUrl, className }: FileViewerProps) {
  const { theme } = useSettingsStore();
  const resolvedTheme = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ? 'github-dark'
    : 'github-light';

  const { html, loading } = useShiki(content, language, resolvedTheme);
  const [copied, setCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = content.split('\n').length;

  return (
    <div className={cn('border rounded-md overflow-hidden', className)}>
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-mono">{filename}</span>
          <span>·</span>
          <span>{lineCount} lines</span>
          <span>·</span>
          <span>{(new TextEncoder().encode(content).length / 1024).toFixed(1)} KB</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className="h-7 text-xs"
          >
            <Hash className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs">
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          {rawUrl && (
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
              <a href={rawUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-auto max-h-[70vh]">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-4" style={{ width: `${60 + Math.random() * 40}%` }} />
            ))}
          </div>
        ) : (
          <div
            className={cn('text-sm', showLineNumbers && 'file-viewer-numbered')}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </div>
  );
}
