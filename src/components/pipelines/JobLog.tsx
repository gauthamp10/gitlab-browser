import { useEffect, useRef, useState } from 'react';
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

function parseAnsiToHtml(text: string): string {
  const ansiMap: Record<string, string> = {
    '0': 'color:inherit;font-weight:normal',
    '1': 'font-weight:bold',
    '31': 'color:#ff5555',
    '32': 'color:#50fa7b',
    '33': 'color:#f1fa8c',
    '34': 'color:#6272a4',
    '35': 'color:#ff79c6',
    '36': 'color:#8be9fd',
    '37': 'color:#f8f8f2',
    '90': 'color:#6272a4',
    '91': 'color:#ff6e6e',
    '92': 'color:#69ff47',
    '93': 'color:#ffffa5',
    '94': 'color:#d6acff',
    '95': 'color:#ff92df',
    '96': 'color:#a4ffff',
  };

  let result = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  result = result.replace(/\x1b\[([0-9;]*)m/g, (_, codes) => {
    if (!codes || codes === '0') return '</span><span style="color:inherit">';
    const parts = codes.split(';');
    const styles = parts.map((c: string) => ansiMap[c]).filter(Boolean).join(';');
    return styles ? `</span><span style="${styles}">` : '</span><span>';
  });

  result = result.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');

  return `<span style="color:#f8f8f2">${result}</span>`;
}

export default function JobLog({ projectId, jobId, status, fetchLog }: JobLogProps) {
  const [log, setLog] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
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
            dangerouslySetInnerHTML={{ __html: parseAnsiToHtml(log) }}
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
