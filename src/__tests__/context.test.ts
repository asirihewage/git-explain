import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExecFileSync = vi.fn();
vi.mock("node:child_process", () => ({
  execFileSync: mockExecFileSync,
}));

beforeEach(() => {
  mockExecFileSync.mockReset();
});

const DIFF = `diff --git a/src/a.ts b/src/a.ts
index abc..def 100644
--- a/src/a.ts
+++ b/src/a.ts
@@ -1 +1 @@
-old
+new
diff --git a/src/b.ts b/src/b.ts
index ghi..jkl 100644
--- a/src/b.ts
+++ b/src/b.ts
@@ -1 +1 @@
-foo
+bar`;

describe("gatherContext", () => {
  it("extracts changed files from diff", async () => {
    mockExecFileSync
      .mockReturnValueOnce("abc123 recent commit")
      .mockReturnValueOnce("# src/a.ts\nabc123 fix a")
      .mockReturnValueOnce("# src/b.ts\ndef456 fix b");

    const { gatherContext } = await import("../context.js");
    const ctx = gatherContext(DIFF);

    expect(ctx.changedFiles).toEqual(["src/a.ts", "src/b.ts"]);
    expect(ctx.recentCommits).toBe("abc123 recent commit");
  });

  it("returns empty arrays when diff has no changes", async () => {
    const { gatherContext } = await import("../context.js");
    const ctx = gatherContext("");

    expect(ctx.changedFiles).toEqual([]);
    expect(ctx.recentCommits).toBe("");
    expect(ctx.fileHistories).toBe("");
  });

  it("handles execFileSync errors gracefully", async () => {
    mockExecFileSync.mockImplementation(() => { throw new Error("git not available"); });

    const { gatherContext } = await import("../context.js");
    const ctx = gatherContext(DIFF);

    expect(ctx.changedFiles).toEqual(["src/a.ts", "src/b.ts"]);
  });
});
