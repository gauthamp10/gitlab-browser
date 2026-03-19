import { useEffect, useMemo, useRef, useState } from 'react';
import AnsiToHtml from 'ansi-to-html';
import { Download } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../utils/cn';
import type { PipelineStatus } from '../../types/gitlab';

interface JobLogProps {
  projectId: number;
  jobId: number;
  status: PipelineStatus;
  fetchLog: (projectId: number, jobId: number) => Promise<string>;
}

// ansi-to-html escapes HTML entities before converting ANSI codes, so the
// output is safe to inject via dangerouslySetInnerHTML.
const ansiConverter = new AnsiToHtml({
  fg: '#f8f8f2',
  bg: '#0d1117',
  newline: false,
  escapeXML: true, // HTML-entity-escapes < > & before processing ANSI
  stream: false,
  colors: {
    0: '#0d1117',
    1: '#ff5555',
    2: '#50fa7b',
    3: '#f1fa8c',
    4: '#6272a4',
    5: '#ff79c6',
    6: '#8be9fd',
    7: '#f8f8f2',
    8: '#6272a4',
    9: '#ff6e6e',
    10: '#69ff47',
    11: '#ffffa5',
    12: '#d6acff',
    13: '#ff92df',
    14: '#a4ffff',
    15: '#ffffff',
  },
});

export default function JobLog({ projectId, jobId, status, fetchLog }: JobLogProps) {
  const [log, setLog] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const logHtml = useMemo(() => (log ? ansiConverter.toHtml(log) : ''), [log]);
  const isRunning = status === 'running' || status === 'pending' || status === 'preparing';

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let cancelled = false;

    const load = async () => {
      try {
        const text = await fetchLog(projectId, jobId);
        if (!cancelled) {
          setLog(text);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load log');
          setLoading(false);
        }
      }
    };

    load();

    if (isRunning) {
      interval = setInterval(load, 5000);
    }

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [projectId, jobId, isRunning, fetchLog]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log]);

  const handleDownload = () => {
    const blob = new Blob([log], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-${jobId}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-[#0d1117] border-gray-800">
        <span className="text-xs text-gray-400">Job #{jobId} output</span>
        <Button variant="ghost" size="sm" onClick={handleDownload} className="text-gray-400 hover:text-white h-7">
          <Download className="h-3.5 w-3.5 mr-1" />
          Download
        </Button>
      </div>

      <div
        ref={scrollRef}
        className={cn(
          'flex-1 overflow-auto p-4 font-mono text-xs leading-5 bg-[#0d1117] min-h-[300px]',
          'job-log'
        )}
      >
        {loading ? (
          <span className="text-gray-500">Loading log...</span>
        ) : error ? (
          <span className="text-red-400">{error}</span>
        ) : log ? (
          <div
            dangerouslySetInnerHTML={{ __html: logHtml }}
            className="whitespace-pre-wrap break-all"
          />
        ) : (
          <span className="text-gray-500">No output available</span>
        )}

        {isRunning && !loading && (
          <span className="animate-pulse text-green-400">█</span>
        )}
      </div>
    </div>
  );
}
