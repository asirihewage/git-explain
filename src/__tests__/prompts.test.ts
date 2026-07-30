import { describe, it, expect } from "vitest";
import { buildComprehensivePrompt, buildCommitMessagePrompt, buildRiskPrompt } from "../prompts.js";
import type { RepoContext } from "../context.js";

const ctx: RepoContext = {
  recentCommits: "abc123 fix: thing\n def456 feat: stuff",
  fileHistories: "# src/index.ts\nabc123 fix: thing",
  changedFiles: ["src/index.ts", "src/config.ts"],
};

describe("buildComprehensivePrompt", () => {
  it("includes the diff, context sections, and instruction headings", () => {
    const { system, prompt } = buildComprehensivePrompt("diff --git a/src/x.ts b/src/x.ts\n--- a/src/x.ts\n+++ b/src/x.ts\n@@ -1 +1 @@\n-old\n+new", ctx, "");

    expect(system).toContain("expert senior software engineer");
    expect(prompt).toContain("```diff");
    expect(prompt).toContain("diff --git a/src/x.ts b/src/x.ts");
    expect(prompt).toContain("## Recent Repository Activity");
    expect(prompt).toContain("## Per-file Recent History");
    expect(prompt).toContain("## Changed Files");
    expect(prompt).toContain("### Summary");
    expect(prompt).toContain("### Why This Change Was Made");
    expect(prompt).toContain("### Potential Regressions");
    expect(prompt).toContain("### Affected Modules");
    expect(prompt).toContain("### Suggested Commit Message");
    expect(prompt).toContain("### PR Description");
    expect(prompt).toContain("### Test Cases");
  });

  it("omits context sections when empty", () => {
    const empty: RepoContext = { recentCommits: "", fileHistories: "", changedFiles: [] };
    const { prompt } = buildComprehensivePrompt("diff --git a/x.ts b/x.ts\n@@ -1 +1 @@\n-old\n+new", empty, "");

    expect(prompt).not.toContain("## Recent Repository Activity");
    expect(prompt).not.toContain("## Per-file Recent History");
    expect(prompt).not.toContain("## Changed Files");
  });

  it("includes commit info when provided", () => {
    const { prompt } = buildComprehensivePrompt("diff --git a/x.ts b/x.ts\n@@ -1 +1 @@\n-old\n+new", ctx, "commit abc123\nAuthor: test");

    expect(prompt).toContain("## Commit");
    expect(prompt).toContain("commit abc123");
  });
});

describe("buildCommitMessagePrompt", () => {
  it("includes diff and changed files", () => {
    const { system, prompt } = buildCommitMessagePrompt("diff --git a/x.ts b/x.ts\n@@ -1 +1 @@\n-old\n+new", ctx);

    expect(system).toContain("conventional commit");
    expect(prompt).toContain("```diff");
    expect(prompt).toContain("## Changed Files");
    expect(prompt).toContain("## Recent Commits");
    expect(prompt).toContain("Format:");
  });
});

describe("buildRiskPrompt", () => {
  it("includes assessment criteria", () => {
    const { system, prompt } = buildRiskPrompt("diff --git a/x.ts b/x.ts\n@@ -1 +1 @@\n-old\n+new", ctx);

    expect(system).toContain("risk assessment");
    expect(prompt).toContain("**Risk Level**");
    expect(prompt).toContain("**Breaking changes**");
    expect(prompt).toContain("**Security**");
    expect(prompt).toContain("**Rollback complexity**");
  });
});
