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

export function getFileDependencies(files: string[]): string {
  if (files.length === 0) return "";
  const parts: string[] = [];

  for (const file of files.slice(0, 5)) {
    try {
      const content = execFileSync("git", ["show", `HEAD:${file}`], {
        encoding: "utf-8",
        timeout: 3000,
      });
      const imports: string[] = [];
      for (const line of content.split("\n")) {
        const m = line.match(
          /(?:import|require)\s+.*?['"]([^'"]+)['"]/,
        );
        if (m) imports.push(m[1]);
      }
      if (imports.length > 0) {
        parts.push(`# ${file} depends on:\n  ${imports.join("\n  ")}`);
      }
    } catch {
      // file may not exist at HEAD (new file)
    }
  }

  return parts.join("\n\n");
}
