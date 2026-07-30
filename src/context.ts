import { execFileSync } from "node:child_process";

export interface RepoContext {
  recentCommits: string;
  fileHistories: string;
  changedFiles: string[];
}

export function gatherContext(diff: string): RepoContext {
  const files = extractChangedFiles(diff);
  const recentCommits = getRecentCommits();
  const fileHistories = getFileHistories(files);

  return { recentCommits, fileHistories, changedFiles: files };
}

function extractChangedFiles(diff: string): string[] {
  const files: string[] = [];
  for (const line of diff.split("\n")) {
    const m = line.match(/^diff --git a\/(.+?) b\//);
    if (m) files.push(m[1]);
  }
  return files;
}

function getRecentCommits(): string {
  try {
    return execFileSync("git", ["log", "--oneline", "-20"], {
      encoding: "utf-8",
    }).trim();
  } catch {
    return "";
  }
}

function getFileHistories(files: string[]): string {
  if (files.length === 0) return "";
  const parts: string[] = [];

  for (const file of files.slice(0, 10)) {
    try {
      const log = execFileSync(
        "git",
        ["log", "--oneline", "-5", "--", file],
        { encoding: "utf-8" },
      ).trim();
      if (log) parts.push(`# ${file}\n${log}`);
    } catch {
      // skip
    }
  }

  return parts.join("\n\n");
}


