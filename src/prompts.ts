import type { RepoContext } from "./context.js";

export function buildComprehensivePrompt(
  diff: string,
  ctx: RepoContext,
  commitInfo: string,
): { system: string; prompt: string } {
  return {
    system:
      "You are an expert senior software engineer reviewing a git change. "
      + "Analyze the diff along with the repository context to provide a thorough, actionable review.",
    prompt: [
      "Analyze this git change using the diff AND the surrounding repository context.",
      "",
      commitInfo ? `## Commit\n${commitInfo}` : "",
      "",
      "## Diff",
      "```diff",
      diff,
      "```",
      "",
      ctx.recentCommits
        ? "## Recent Repository Activity\n```\n" + ctx.recentCommits + "\n```"
        : "",
      "",
      ctx.fileHistories
        ? "## Per-file Recent History\n```\n" + ctx.fileHistories + "\n```"
        : "",
      "",
      ctx.changedFiles.length > 0
        ? "## Changed Files\n" + ctx.changedFiles.map((f) => "  - " + f).join("\n")
        : "",
      "",
      "---",
      "",
      "Provide the following sections in your response. Use markdown headings.",
      "",
      "### Summary",
      "A 2-3 sentence overview of what this change does.",
      "",
      "### Why This Change Was Made",
      "Infer the motivation from the diff, the commit context, and the recent repository history. "
      + "Explain the problem being solved, not just the code being changed.",
      "",
      "### Potential Regressions",
      "List specific regressions that could be introduced, with file/module references.",
      "",
      "### Affected Modules",
      "List all modules, files, or components that this change impacts directly or indirectly.",
      "",
      "### Suggested Commit Message",
      "A conventional commit message (type(scope): description).",
      "",
      "### PR Description",
      "A 3-5 sentence PR description summarizing the change, motivation, and risks.",
      "",
      "### Test Cases",
      "Specific test scenarios that should be added or updated to cover this change.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export function buildCommitMessagePrompt(
  diff: string,
  ctx: RepoContext,
): { system: string; prompt: string } {
  return {
    system:
      "You are an expert at writing conventional commit messages. Be concise and meaningful.",
    prompt: [
      "Generate a conventional commit message for this change.",
      "",
      "## Diff",
      "```diff",
      diff,
      "```",
      "",
      ctx.recentCommits
        ? "## Recent Commits\n```\n" + ctx.recentCommits + "\n```"
        : "",
      "",
      ctx.changedFiles.length > 0
        ? "## Changed Files\n" + ctx.changedFiles.map((f) => "  - " + f).join("\n")
        : "",
      "",
      "Format: <type>(<scope>): <description>",
      "",
      "<optional body with motivation>",
      "",
      "Types: feat, fix, refactor, chore, docs, style, test, perf, ci, build, revert",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export function buildRiskPrompt(
  diff: string,
  ctx: RepoContext,
): { system: string; prompt: string } {
  return {
    system:
      "You are a senior software engineer performing a risk assessment on code changes.",
    prompt: [
      "Analyze the risk level of this git change using the diff and repository context.",
      "",
      "## Diff",
      "```diff",
      diff,
      "```",
      "",
      ctx.recentCommits
        ? "## Recent Commits\n```\n" + ctx.recentCommits + "\n```"
        : "",
      "",
      ctx.changedFiles.length > 0
        ? "## Changed Files\n" + ctx.changedFiles.map((f) => "  - " + f).join("\n")
        : "",
      "",
      "Assess:",
      "1. **Risk Level** (Low / Medium / High / Critical)",
      "2. **Breaking changes** - Are any APIs or interfaces modified?",
      "3. **Data integrity** - Could this affect data?",
      "4. **Security** - Any security concerns?",
      "5. **Performance** - Could this cause regressions?",
      "6. **Dependencies** - Does this change affect other modules?",
      "7. **Rollback complexity** - How hard would it be to revert?",
      "8. **Specific affected files** - List files at risk",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
