import { useRef, useState, useCallback } from 'react';
import { Upload, X, FileIcon, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useApi } from '../../api';
import { formatFileSize } from '../../utils/format';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: number;
  currentPath: string;
  currentRef: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result is "data:<mime>;base64,<data>" — strip the prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function UploadFileDialog({
  open, onClose, projectId, currentPath, currentRef,
}: Props) {
  const api = useApi();
  const queryClient = useQueryClient();

  const [dragging, setDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [branch, setBranch] = useState(currentRef);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    setSelectedFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      const next = [...prev];
      for (const f of Array.from(files)) {
        if (!existing.has(f.name)) next.push(f);
      }
      return next;
    });
    setError(null);
  };

  const removeFile = (name: string) =>
    setSelectedFiles((prev) => prev.filter((f) => f.name !== name));

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  const handleSubmit = async () => {
    if (!selectedFiles.length) { setError('Select at least one file.'); return; }
    if (!commitMessage.trim()) { setError('Commit message is required.'); return; }
    if (!branch.trim()) { setError('Target branch is required.'); return; }

    setLoading(true);
    setError(null);

    try {
      for (const file of selectedFiles) {
        const filePath = currentPath
          ? `${currentPath}/${file.name}`
          : file.name;
        const content = await fileToBase64(file);
        await api.repository.createFile(projectId, filePath, {
          branch: branch.trim(),
          content,
          commit_message: commitMessage.trim(),
          encoding: 'base64',
        });
      }

      // Invalidate tree so the file list refreshes automatically
      queryClient.invalidateQueries({ queryKey: ['project', String(projectId), 'tree'] });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setCommitMessage('');
    setBranch(currentRef);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload files
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Drop files here or click to select"
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors select-none
              ${dragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
              }`}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">Drop files here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">Any file type · Multiple files supported</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {/* Selected file list */}
          {selectedFiles.length > 0 && (
            <ul className="space-y-1.5 max-h-40 overflow-y-auto">
              {selectedFiles.map((f) => (
                <li
                  key={f.name}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 text-sm"
                >
                  <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate font-mono text-xs">{f.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(f.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(f.name)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label={`Remove ${f.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Target path hint */}
          {currentPath && (
            <p className="text-xs text-muted-foreground">
              Files will be uploaded to <code className="font-mono bg-muted px-1 rounded">{currentPath}/</code>
            </p>
          )}

          {/* Branch */}
          <div className="space-y-1.5">
            <Label htmlFor="upload-branch">Target branch</Label>
            <Input
              id="upload-branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="Branch name"
            />
          </div>

          {/* Commit message */}
          <div className="space-y-1.5">
            <Label htmlFor="upload-commit-msg">Commit message</Label>
            <Textarea
              id="upload-commit-msg"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder={`Add ${selectedFiles.length === 1 ? selectedFiles[0]?.name ?? 'file' : 'files'}`}
              rows={2}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedFiles.length}>
            {loading
              ? `Uploading (${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''})…`
              : `Upload ${selectedFiles.length > 0 ? `${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}` : 'files'}`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
