/**
 * Git graph lane-assignment algorithm.
 *
 * Given an ordered list of commits (newest → oldest) with their parent_ids,
 * computes which "lane" (column) each commit occupies and the SVG line
 * segments needed to draw the connecting branch lines.
 *
 * Coordinate system for segments:
 *   x  = column index (0, 1, 2, …)
 *   y  = 0 → top edge, 1 → row centre (commit dot), 2 → bottom edge
 */

import type { GitLabCommit } from '../types/gitlab';

export const GRAPH_COLORS = [
  '#61afef', // blue
  '#98c379', // green
  '#e06c75', // red
  '#e5c07b', // yellow
  '#c678dd', // purple
  '#56b6c2', // cyan
  '#d19a66', // orange
  '#abb2bf', // grey
];

interface Lane {
  sha: string;
  color: string;
}

export interface GraphSegment {
  x1: number;
  y1: number; // 0 | 1 | 2
  x2: number;
  y2: number;
  color: string;
}

export interface GraphRow {
  commit: GitLabCommit;
  col: number;
  color: string;
  segments: GraphSegment[];
  numCols: number;
}

/** Mutable state that must be carried across paginated batches. */
export interface GraphState {
  lanes: (Lane | null)[];
  nextColorIdx: number;
}

export function buildGraphRows(
  commits: GitLabCommit[],
  state: GraphState = { lanes: [], nextColorIdx: 0 },
): { rows: GraphRow[]; state: GraphState } {
  // Work on mutable copies so callers can pass the same object safely
  let lanes: (Lane | null)[] = state.lanes.map((l) => (l ? { ...l } : null));
  let { nextColorIdx } = state;

  const rows: GraphRow[] = [];

  for (const commit of commits) {
    const parentIds = commit.parent_ids ?? [];

    // Snapshot lanes BEFORE mutating them for this commit
    const prevLanes = lanes.map((l) => (l ? { ...l } : null));

    // ── Find or assign a column for this commit ──────────────────────────
    let col = lanes.findIndex((l) => l?.sha === commit.id);
    let color: string;

    if (col === -1) {
      // Commit not yet tracked (first commit in list, or a detached ref)
      const emptySlot = lanes.findIndex((l) => l === null);
      col = emptySlot !== -1 ? emptySlot : lanes.length;
      color = GRAPH_COLORS[nextColorIdx++ % GRAPH_COLORS.length];
      lanes = [...lanes];
      if (col >= lanes.length) {
        lanes.push({ sha: commit.id, color });
      } else {
        lanes[col] = { sha: commit.id, color };
      }
    } else {
      color = lanes[col]!.color;
    }

    // ── Build next-lanes state ────────────────────────────────────────────
    let newLanes: (Lane | null)[] = lanes.map((l) => (l ? { ...l } : null));

    if (parentIds.length === 0) {
      // Root commit – close the lane
      newLanes[col] = null;
    } else {
      const firstSha = parentIds[0];
      // If the first parent is already tracked in another lane, close this one
      const alreadyTracked = newLanes.findIndex(
        (l, j) => l?.sha === firstSha && j !== col,
      );
      newLanes[col] = alreadyTracked !== -1 ? null : { sha: firstSha, color };
    }

    // Additional parents (merge commits) → open new lanes if needed
    for (const pSha of parentIds.slice(1)) {
      if (!newLanes.some((l) => l?.sha === pSha)) {
        const pColor = GRAPH_COLORS[nextColorIdx++ % GRAPH_COLORS.length];
        const emptySlot = newLanes.findIndex((l) => l === null);
        if (emptySlot !== -1) {
          newLanes[emptySlot] = { sha: pSha, color: pColor };
        } else {
          newLanes = [...newLanes, { sha: pSha, color: pColor }];
        }
      }
    }

    // Trim trailing null slots
    while (newLanes.length > 0 && newLanes[newLanes.length - 1] === null) {
      newLanes = newLanes.slice(0, -1);
    }

    // ── Build SVG segments ─────────────────────────────────────────────────
    const segments: GraphSegment[] = [];
    const numCols = Math.max(prevLanes.length, newLanes.length, col + 1);

    // Incoming connections (top half of the row: y 0→1)
    for (let c = 0; c < prevLanes.length; c++) {
      const lane = prevLanes[c];
      if (!lane) continue;

      if (lane.sha === commit.id) {
        // Lane arrives at this commit (straight or diagonal to col)
        segments.push({ x1: c, y1: 0, x2: col, y2: 1, color: lane.color });
      } else {
        // Lane passes through – find where it ends up
        const dest = newLanes.findIndex((l) => l?.sha === lane.sha);
        if (dest !== -1) {
          // Span the full row height (0→2) so it connects seamlessly
          segments.push({ x1: c, y1: 0, x2: dest, y2: 2, color: lane.color });
        }
      }
    }

    // Outgoing connections (bottom half: y 1→2) – commit to each parent
    for (const pSha of parentIds) {
      const destCol = newLanes.findIndex((l) => l?.sha === pSha);
      if (destCol !== -1) {
        segments.push({ x1: col, y1: 1, x2: destCol, y2: 2, color });
      }
    }

    rows.push({ commit, col, color, segments, numCols });
    lanes = newLanes;
  }

  return {
    rows,
    state: { lanes, nextColorIdx },
  };
}
