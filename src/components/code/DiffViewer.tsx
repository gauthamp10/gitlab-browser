import { useState } from 'react';
import { ChevronDown, ChevronRight, FilePlus, FileX, FileMinus } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../utils/cn';
import type { GitLabDiff } from '../../types/gitlab';

interface DiffViewerProps {
  diffs: GitLabDiff[];
  viewType?: 'unified' | 'split';
}

interface ParsedLine {
  type: 'add' | 'del' | 'context' | 'header';
  content: string;
  oldLineNo: number | null;
  newLineNo: number | null;
}

function parseDiff(diffText: string): ParsedLine[] {
  const lines = diffText.split('\n');
  const result: ParsedLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      result.push({ type: 'header', content: line, oldLineNo: null, newLineNo: null });
    } else if (line.startsWith('+')) {
      result.push({ type: 'add', content: line.slice(1), oldLineNo: null, newLineNo: newLine });
      newLine++;
    } else if (line.startsWith('-')) {
      result.push({ type: 'del', content: line.slice(1), oldLineNo: oldLine, newLineNo: null });
      oldLine++;
    } else {
      const content = line.startsWith('\\') ? line : line.slice(1);
      result.push({ type: 'context', content, oldLineNo: oldLine, newLineNo: newLine });
      oldLine++;
      newLine++;
    }
  }
  return result;
}

function FileDiff({ diff, viewType }: { diff: GitLabDiff; viewType: 'unified' | 'split' }) {
  const [collapsed, setCollapsed] = useState(false);
  const lines = parseDiff(diff.diff);

  const fileIcon = diff.new_file ? (
    <FilePlus className="h-4 w-4 text-green-500" />
  ) : diff.deleted_file ? (
    <FileX className="h-4 w-4 text-red-500" />
  ) : (
    <FileMinus className="h-4 w-4 text-blue-500" />
  );

  return (
    <div className="border rounded-md overflow-hidden mb-4">
      <div
        className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {fileIcon}
        <span className="font-mono text-sm">
          {diff.renamed_file
            ? `${diff.old_path} → ${diff.new_path}`
            : diff.new_file
            ? diff.new_path
            : diff.deleted_file
            ? diff.old_path
            : diff.new_path}
        </span>
        {diff.new_file && <span className="text-xs text-green-500 ml-auto">+added</span>}
        {diff.deleted_file && <span className="text-xs text-red-500 ml-auto">deleted</span>}
        {diff.renamed_file && <span className="text-xs text-blue-500 ml-auto">renamed</span>}
      </div>

      {!collapsed && (
        <div className="overflow-x-auto">
          {viewType === 'unified' ? (
            <UnifiedView lines={lines} />
          ) : (
            <SplitView lines={lines} />
          )}
        </div>
      )}
    </div>
  );
}

function UnifiedView({ lines }: { lines: ParsedLine[] }) {
  return (
    <table className="w-full text-xs font-mono border-collapse">
      <tbody>
        {lines.map((line, i) => (
          <tr
            key={i}
            className={cn(
              line.type === 'add' && 'bg-green-50 dark:bg-green-950/20',
              line.type === 'del' && 'bg-red-50 dark:bg-red-950/20',
              line.type === 'header' && 'bg-blue-50 dark:bg-blue-950/20'
            )}
          >
            <td className="w-12 text-right pr-2 pl-2 text-muted-foreground border-r border-border select-none">
              {line.oldLineNo ?? ''}
            </td>
            <td className="w-12 text-right pr-2 pl-2 text-muted-foreground border-r border-border select-none">
              {line.newLineNo ?? ''}
            </td>
            <td className="w-5 text-center select-none text-muted-foreground">
              {line.type === 'add' ? (
                <span className="text-green-600 dark:text-green-400">+</span>
              ) : line.type === 'del' ? (
                <span className="text-red-600 dark:text-red-400">-</span>
              ) : line.type === 'header' ? (
                <span className="text-blue-600 dark:text-blue-400">@</span>
              ) : (
                ' '
              )}
            </td>
            <td
              className={cn(
                'px-2 py-0.5 whitespace-pre',
                line.type === 'add' && 'text-green-800 dark:text-green-300',
                line.type === 'del' && 'text-red-800 dark:text-red-300',
                line.type === 'header' && 'text-blue-700 dark:text-blue-400 italic'
              )}
            >
              {line.content}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SplitView({ lines }: { lines: ParsedLine[] }) {
  const pairs: Array<{ left: ParsedLine | null; right: ParsedLine | null }> = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.type === 'header' || line.type === 'context') {
      pairs.push({ left: line, right: line });
      i++;
    } else if (line.type === 'del') {
      const next = lines[i + 1];
      if (next?.type === 'add') {
        pairs.push({ left: line, right: next });
        i += 2;
      } else {
        pairs.push({ left: line, right: null });
        i++;
      }
    } else {
      pairs.push({ left: null, right: line });
      i++;
    }
  }

  return (
    <table className="w-full text-xs font-mono border-collapse">
      <tbody>
        {pairs.map((pair, i) => (
          <tr key={i}>
            <td className="w-8 text-right pr-1.5 pl-1.5 text-muted-foreground border-r border-border select-none text-[10px]">
              {pair.left?.oldLineNo ?? ''}
            </td>
            <td
              className={cn(
                'w-1/2 px-2 py-0.5 whitespace-pre border-r border-border',
                pair.left?.type === 'del' && 'bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300',
                pair.left?.type === 'header' && 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 italic',
              )}
            >
              {pair.left?.content ?? ''}
            </td>
            <td className="w-8 text-right pr-1.5 pl-1.5 text-muted-foreground border-r border-border select-none text-[10px]">
              {pair.right?.newLineNo ?? ''}
            </td>
            <td
              className={cn(
                'w-1/2 px-2 py-0.5 whitespace-pre',
                pair.right?.type === 'add' && 'bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300',
                pair.right?.type === 'header' && 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 italic',
              )}
            >
              {pair.right?.content ?? ''}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function DiffViewer({ diffs, viewType: defaultViewType = 'unified' }: DiffViewerProps) {
  const [viewType, setViewType] = useState<'unified' | 'split'>(defaultViewType);

  if (!diffs.length) {
    return <div className="text-sm text-muted-foreground py-4 text-center">No changes to show</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">
          {diffs.length} file{diffs.length !== 1 ? 's' : ''} changed
        </span>
        <div className="flex border rounded-md overflow-hidden">
          <Button
            variant={viewType === 'unified' ? 'secondary' : 'ghost'}
            size="sm"
            className="rounded-none"
            onClick={() => setViewType('unified')}
          >
            Unified
          </Button>
          <Button
            variant={viewType === 'split' ? 'secondary' : 'ghost'}
            size="sm"
            className="rounded-none"
            onClick={() => setViewType('split')}
          >
            Split
          </Button>
        </div>
      </div>

      {diffs.map((diff, i) => (
        <FileDiff key={i} diff={diff} viewType={viewType} />
      ))}
    </div>
  );
}
