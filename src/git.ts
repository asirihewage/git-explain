import { execFileSync } from "node:child_process";

export interface DiffResult {
  diff: string;
  stats: { files: number; insertions: number; deletions: number };
  commitInfo: string;
}

export function getWorkingTreeDiff(): DiffResult {
  const diff = execFileSync("git", ["diff", "--unified=10"], { encoding: "utf-8" });
  return parseDiffResult(diff, "", false);
}

export function getStagedDiff(): DiffResult {
  const diff = execFileSync("git", ["diff", "--staged", "--unified=10"], { encoding: "utf-8" });
  return parseDiffResult(diff, "", true);
}

export function getCommitDiff(commit: string): DiffResult {
  const output = execFileSync("git", ["show", commit, "--unified=10", "--format=commit %H%nAuthor: %an <%ae>%nDate:   %ad%n%n%s%n%b"], { encoding: "utf-8" });

  const headerEnd = output.search(/\ndiff --git /);
  const commitInfo = headerEnd === -1 ? output.trim() : output.slice(0, headerEnd).trim();
  const diff = headerEnd === -1 ? "" : output.slice(headerEnd + 1);

  return parseDiffResult(diff, commitInfo, false, commit);
}

function parseDiffResult(
  diff: string,
  commitInfo: string,
  staged: boolean,
  commit?: string,
): DiffResult {
  if (!diff.trim()) {
    return { diff, stats: { files: 0, insertions: 0, deletions: 0 }, commitInfo };
  }

  const args = commit
    ? ["show", commit, "--stat", "--format="]
    : ["diff", "--stat"];
  if (!commit && staged) args.push("--staged");

  try {
    const statsOutput = execFileSync("git", args, { encoding: "utf-8" });
    const lines = statsOutput.trim().split("\n").filter((l) => l.trim());
    const lastLine = lines[lines.length - 1] || "";

    const fileCount = parseInt(lastLine.match(/(\d+) files? changed/)?.[1] || "0");
    const insertions = parseInt(lastLine.match(/(\d+) insertion/)?.[1] || "0");
    const deletions = parseInt(lastLine.match(/(\d+) deletion/)?.[1] || "0");

    return { diff, stats: { files: fileCount, insertions, deletions }, commitInfo };
  } catch {
    return { diff, stats: { files: 0, insertions: 0, deletions: 0 }, commitInfo };
  }
}
