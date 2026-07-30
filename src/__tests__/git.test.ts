import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExecFileSync = vi.fn();
vi.mock("node:child_process", () => ({
  execFileSync: mockExecFileSync,
}));

const SAMPLE_DIFF = `diff --git a/src/index.ts b/src/index.ts
index abc..def 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1 +1 @@
-old line
+new line`;

const SAMPLE_STATS = ` src/index.ts | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)`;

beforeEach(() => {
  mockExecFileSync.mockReset();
});

describe("getWorkingTreeDiff", () => {
  it("calls git diff and returns parsed result", async () => {
    mockExecFileSync
      .mockReturnValueOnce(SAMPLE_DIFF)
      .mockReturnValueOnce(SAMPLE_STATS);

    const { getWorkingTreeDiff } = await import("../git.js");
    const result = getWorkingTreeDiff();

    expect(mockExecFileSync).toHaveBeenCalledWith("git", ["diff", "--unified=10"], { encoding: "utf-8" });
    expect(result.stats.files).toBe(1);
    expect(result.stats.insertions).toBe(1);
    expect(result.stats.deletions).toBe(1);
    expect(result.diff).toContain("diff --git");
    expect(result.commitInfo).toBe("");
  });

  it("returns zero stats when there is no diff", async () => {
    mockExecFileSync.mockReturnValue("");

    const { getWorkingTreeDiff } = await import("../git.js");
    const result = getWorkingTreeDiff();
    expect(result.stats.files).toBe(0);
    expect(result.stats.insertions).toBe(0);
    expect(result.stats.deletions).toBe(0);
  });
});

describe("getStagedDiff", () => {
  it("calls git diff --staged and returns parsed result", async () => {
    mockExecFileSync
      .mockReturnValueOnce(SAMPLE_DIFF)
      .mockReturnValueOnce(SAMPLE_STATS);

    const { getStagedDiff } = await import("../git.js");
    const result = getStagedDiff();

    expect(mockExecFileSync).toHaveBeenCalledWith("git", ["diff", "--staged", "--unified=10"], { encoding: "utf-8" });
    expect(mockExecFileSync).toHaveBeenCalledWith("git", ["diff", "--stat", "--staged"], { encoding: "utf-8" });
    expect(result.stats.files).toBe(1);
  });
});

describe("getCommitDiff", () => {
  const SHOW_OUTPUT = `commit abc123def456
Author: Test <test@test.com>
Date:   Mon Jan 1 00:00:00 2024

feat: add feature

diff --git a/src/x.ts b/src/x.ts
index abc..def 100644
--- a/src/x.ts
+++ b/src/x.ts
@@ -1 +1 @@
-old
+new`;

  it("extracts commit info and diff", async () => {
    mockExecFileSync
      .mockReturnValueOnce(SHOW_OUTPUT)
      .mockReturnValueOnce(SAMPLE_STATS);

    const { getCommitDiff } = await import("../git.js");
    const result = getCommitDiff("abc123def456");

    expect(mockExecFileSync).toHaveBeenCalledWith("git", ["show", "abc123def456", "--unified=10", "--format=commit %H%nAuthor: %an <%ae>%nDate:   %ad%n%n%s%n%b"], { encoding: "utf-8" });
    expect(result.commitInfo).toContain("commit abc123def456");
    expect(result.commitInfo).toContain("feat: add feature");
    expect(result.diff).toContain("diff --git");
  });
});
