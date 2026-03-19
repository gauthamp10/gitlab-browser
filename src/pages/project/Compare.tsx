import { useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { GitCompare, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import DiffViewer from '../../components/code/DiffViewer';
import { Skeleton } from '../../components/ui/skeleton';
import { useApi } from '../../api';
import type { GitLabProject } from '../../types/gitlab';

interface OutletContext { project: GitLabProject }

export default function Compare() {
  const { id } = useParams<{ id: string }>();
  const { project } = useOutletContext<OutletContext>();
  const api = useApi();

  const [fromRef, setFromRef] = useState(project.default_branch);
  const [toRef, setToRef] = useState(project.default_branch);
  const [comparing, setComparing] = useState(false);

  const { data: branches } = useQuery({
    queryKey: ['project', id, 'branches'],
    queryFn: () => api.projects.getBranches(Number(id), { per_page: 100 }),
  });

  const { data: comparison, isLoading, refetch } = useQuery({
    queryKey: ['project', id, 'compare', fromRef, toRef],
    queryFn: () => api.projects.compare(Number(id), fromRef, toRef),
    enabled: comparing && fromRef !== toRef,
  });

  const handleCompare = () => {
    setComparing(true);
    refetch();
  };

  const refs = branches?.items.map((b) => b.name) ?? [project.default_branch];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <GitCompare className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Compare branches</h2>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={fromRef} onValueChange={setFromRef}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Source branch" />
          </SelectTrigger>
          <SelectContent>
            {refs.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>

        <ArrowRight className="h-5 w-5 text-muted-foreground" />

        <Select value={toRef} onValueChange={setToRef}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Target branch" />
          </SelectTrigger>
          <SelectContent>
            {refs.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button onClick={handleCompare} disabled={fromRef === toRef || isLoading}>
          <GitCompare className="h-4 w-4 mr-2" />
          Compare
        </Button>
      </div>

      {fromRef === toRef && (
        <p className="text-sm text-muted-foreground">Select two different branches to compare.</p>
      )}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      )}

      {comparison && !isLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{comparison.commits.length} commit{comparison.commits.length !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{comparison.diffs.length} file{comparison.diffs.length !== 1 ? 's' : ''} changed</span>
          </div>
          <DiffViewer diffs={comparison.diffs.map((d) => ({
            old_path: d.old_path,
            new_path: d.new_path,
            diff: d.diff,
            new_file: d.new_file,
            renamed_file: d.renamed_file,
            deleted_file: d.deleted_file,
            a_mode: '',
            b_mode: '',
          }))} />
        </div>
      )}
    </div>
  );
}
