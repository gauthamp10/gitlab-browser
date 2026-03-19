import { useState } from 'react';
import { Save, X, AlertCircle, GitCommit } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

interface Props {
  filename: string;
  initialContent: string;
  branch: string;
  lastCommitId?: string;
  onSave: (params: {
    content: string;
    commitMessage: string;
    branch: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function InlineEditor({
  filename, initialContent, branch, onSave, onCancel,
}: Props) {
  const [content, setContent] = useState(initialContent);
  const [commitMessage, setCommitMessage] = useState(`Update ${filename}`);
  const [targetBranch, setTargetBranch] = useState(branch);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = content !== initialContent;

  const handleSave = async () => {
    if (!commitMessage.trim()) { setError('Commit message is required.'); return; }
    if (!targetBranch.trim()) { setError('Branch is required.'); return; }
    setLoading(true);
    setError(null);
    try {
      await onSave({ content, commitMessage: commitMessage.trim(), branch: targetBranch.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
      setLoading(false);
    }
  };

  const lineCount = content.split('\n').length;

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-mono font-medium text-foreground">{filename}</span>
          <span>·</span>
          <span>{lineCount} lines</span>
          {isDirty && (
            <>
              <span>·</span>
              <span className="text-amber-500 text-xs font-medium">unsaved changes</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading} className="h-7 text-xs gap-1">
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
        </div>
      </div>

      {/* Textarea */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        spellCheck={false}
        className="w-full font-mono text-sm leading-relaxed p-4 bg-background resize-none focus:outline-none min-h-[400px] max-h-[65vh] overflow-auto"
        style={{ tabSize: 2 }}
      />

      {/* Commit bar */}
      <div className="border-t bg-muted/30 px-4 py-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <GitCommit className="h-3.5 w-3.5" />
          Commit changes
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label htmlFor="inline-commit-msg" className="text-xs">Commit message</Label>
            <Input
              id="inline-commit-msg"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Describe your changes"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="inline-branch" className="text-xs">Target branch</Label>
            <Input
              id="inline-branch"
              value={targetBranch}
              onChange={(e) => setTargetBranch(e.target.value)}
              placeholder="Branch name"
              className="h-8 text-sm font-mono"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleSave}
              disabled={loading || !isDirty}
              size="sm"
              className="w-full gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              {loading ? 'Committing…' : 'Commit changes'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
