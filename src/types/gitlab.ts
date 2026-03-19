export interface GitLabUser {
  id: number;
  name: string;
  username: string;
  email: string;
  avatar_url: string;
  web_url: string;
  bio: string | null;
  location: string | null;
  public_email: string | null;
  created_at: string;
  state: 'active' | 'blocked' | 'deactivated';
  followers?: number;
  following?: number;
  is_admin?: boolean;
}

export interface GitLabNamespace {
  id: number;
  name: string;
  path: string;
  kind: 'user' | 'group';
  avatar_url: string | null;
  web_url: string;
  full_path: string;
}

export interface GitLabProjectStatistics {
  commit_count: number;
  storage_size: number;
  repository_size: number;
  lfs_objects_size: number;
  job_artifacts_size: number;
  packages_size: number;
  snippets_size: number;
  wiki_size: number;
}

export interface GitLabProject {
  id: number;
  name: string;
  name_with_namespace: string;
  path: string;
  path_with_namespace: string;
  description: string | null;
  visibility: 'public' | 'internal' | 'private';
  star_count: number;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  http_url_to_repo: string;
  ssh_url_to_repo: string;
  web_url: string;
  namespace: GitLabNamespace;
  avatar_url: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
  empty_repo: boolean;
  topics: string[];
  readme_url: string | null;
  statistics?: GitLabProjectStatistics;
  permissions?: {
    project_access: { access_level: number } | null;
    group_access: { access_level: number } | null;
  };
}

export interface GitLabLabel {
  id: number;
  name: string;
  color: string;
  text_color: string;
  description: string | null;
}

export interface GitLabMilestone {
  id: number;
  iid: number;
  title: string;
  description: string | null;
  state: 'active' | 'closed';
  due_date: string | null;
  start_date: string | null;
  web_url: string;
}

export interface GitLabIssue {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string | null;
  state: 'opened' | 'closed';
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  labels: string[];
  label_details?: GitLabLabel[];
  milestone: GitLabMilestone | null;
  assignee: GitLabUser | null;
  assignees: GitLabUser[];
  author: GitLabUser;
  user_notes_count: number;
  upvotes: number;
  downvotes: number;
  due_date: string | null;
  web_url: string;
  references: { short: string; relative: string; full: string };
  time_stats: {
    time_estimate: number;
    total_time_spent: number;
    human_time_estimate: string | null;
    human_total_time_spent: string | null;
  };
  confidential: boolean;
}

export interface GitLabMergeRequest {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string | null;
  state: 'opened' | 'closed' | 'locked' | 'merged';
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  closed_at: string | null;
  source_branch: string;
  target_branch: string;
  source_project_id: number;
  target_project_id: number;
  author: GitLabUser;
  assignee: GitLabUser | null;
  assignees: GitLabUser[];
  reviewers: GitLabUser[];
  labels: string[];
  milestone: GitLabMilestone | null;
  user_notes_count: number;
  upvotes: number;
  downvotes: number;
  web_url: string;
  sha: string;
  merge_status: string;
  detailed_merge_status?: string;
  head_pipeline: GitLabPipeline | null;
  diff_refs: {
    base_sha: string;
    head_sha: string;
    start_sha: string;
  } | null;
  changes_count: string | null;
  work_in_progress: boolean;
  draft: boolean;
  merge_when_pipeline_succeeds: boolean;
}

export type PipelineStatus =
  | 'created'
  | 'waiting_for_resource'
  | 'preparing'
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'canceled'
  | 'skipped'
  | 'manual'
  | 'scheduled';

export interface GitLabPipeline {
  id: number;
  iid?: number;
  project_id: number;
  sha: string;
  ref: string;
  status: PipelineStatus;
  source?: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
  duration: number | null;
  queued_duration: number | null;
  web_url: string;
  user?: GitLabUser;
  detailed_status?: {
    label: string;
    icon: string;
    favicon: string;
  };
}

export interface GitLabJob {
  id: number;
  name: string;
  stage: string;
  status: PipelineStatus;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  duration: number | null;
  queued_duration: number | null;
  web_url: string;
  allow_failure: boolean;
  pipeline: {
    id: number;
    ref: string;
    sha: string;
    status: PipelineStatus;
    web_url: string;
  };
  runner: {
    id: number;
    description: string;
    active: boolean;
    runner_type: string;
  } | null;
  artifacts: Array<{
    file_type: string;
    size: number;
    filename: string;
    file_format: string | null;
  }>;
  tag: boolean;
  ref: string;
  commit: GitLabCommit;
}

export interface GitLabCommit {
  id: string;
  short_id: string;
  title: string;
  message: string;
  author_name: string;
  author_email: string;
  authored_date: string;
  committer_name: string;
  committer_email: string;
  committed_date: string;
  created_at: string;
  parent_ids: string[];
  web_url: string;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
}

export interface GitLabTreeItem {
  id: string;
  name: string;
  type: 'blob' | 'tree';
  path: string;
  mode: string;
}

export interface GitLabFile {
  file_name: string;
  file_path: string;
  size: number;
  encoding: string;
  content: string;
  content_sha256: string;
  ref: string;
  blob_id: string;
  commit_id: string;
  last_commit_id: string;
  execute_filemode: boolean;
}

export interface GitLabNote {
  id: number;
  body: string;
  author: GitLabUser;
  created_at: string;
  updated_at: string;
  system: boolean;
  noteable_type: string;
  resolvable: boolean;
  resolved: boolean | null;
  resolved_by: GitLabUser | null;
  position?: {
    base_sha: string;
    start_sha: string;
    head_sha: string;
    old_path: string | null;
    new_path: string | null;
    position_type: string;
    old_line: number | null;
    new_line: number | null;
  };
}

export interface GitLabBlame {
  commit: GitLabCommit;
  lines: string[];
}

export interface GitLabGroup {
  id: number;
  name: string;
  path: string;
  description: string | null;
  visibility: 'public' | 'internal' | 'private';
  avatar_url: string | null;
  web_url: string;
  full_name: string;
  full_path: string;
  parent_id: number | null;
  members_count_with_descendants?: number;
  projects_count?: number;
  subgroups_count?: number;
}

export interface GitLabEvent {
  id: number;
  project_id: number | null;
  action_name: string;
  target_id: number | null;
  target_iid: number | null;
  target_type: string | null;
  author_id: number;
  target_title: string | null;
  created_at: string;
  author: GitLabUser;
  push_data?: {
    commit_count: number;
    action: string;
    ref_type: string;
    commit_from: string | null;
    commit_to: string | null;
    ref: string | null;
    commit_title: string | null;
    ref_count: number | null;
  };
  note?: GitLabNote;
}

export interface GitLabTodo {
  id: number;
  project: Pick<GitLabProject, 'id' | 'name' | 'name_with_namespace' | 'path_with_namespace' | 'web_url' | 'avatar_url' | 'namespace'> | null;
  author: GitLabUser;
  action_name: string;
  target_type: string;
  target: {
    id: number;
    iid: number;
    title: string;
    web_url: string;
  };
  target_url: string;
  body: string;
  state: 'pending' | 'done';
  created_at: string;
}

export interface GitLabDiff {
  old_path: string;
  new_path: string;
  a_mode: string;
  b_mode: string;
  diff: string;
  new_file: boolean;
  renamed_file: boolean;
  deleted_file: boolean;
}

export interface GitLabBranch {
  name: string;
  commit: GitLabCommit;
  merged: boolean;
  protected: boolean;
  default: boolean;
  developers_can_push: boolean;
  developers_can_merge: boolean;
  can_push: boolean;
  web_url: string;
}

export interface GitLabTag {
  name: string;
  commit: GitLabCommit;
  message: string | null;
  target: string;
  release: { tag_name: string; description: string } | null;
  protected: boolean;
}

export interface GitLabWikiPage {
  content: string;
  format: string;
  slug: string;
  title: string;
  encoding: string;
}

export interface GitLabContributor {
  name: string;
  email: string;
  commits: number;
  additions: number;
  deletions: number;
}

export interface GitLabSearchResult {
  id: number;
  iid?: number;
  title?: string;
  description?: string;
  state?: string;
  web_url?: string;
  project_id?: number;
  basename?: string;
  data?: string;
  path?: string;
  filename?: string;
  ref?: string;
  startline?: number;
}

export interface PagedResult<T> {
  items: T[];
  pagination: {
    nextPage: number | null;
    prevPage: number | null;
    totalPages: number | null;
    total: number | null;
    nextUrl: string | null;
  };
}
