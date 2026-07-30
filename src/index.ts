import { Command } from "commander";
import { loadConfig } from "./config.js";
import { runSetup } from "./setup.js";
import { getWorkingTreeDiff, getStagedDiff, getCommitDiff } from "./git.js";
import type { DiffResult } from "./git.js";
import { gatherContext } from "./context.js";
import { createLLM } from "./llm/index.js";
import {
  buildComprehensivePrompt,
  buildCommitMessagePrompt,
  buildRiskPrompt,
} from "./prompts.js";
import {
  formatComprehensive,
  formatCommitMessage,
  formatRiskAnalysis,
  formatError,
  formatStats,
} from "./output.js";

async function main() {
  const program = new Command();

  program
    .name("git-explain")
    .description("AI-powered Git change explanations")
    .version("1.0.0")
    .option("--staged", "Explain staged changes")
    .option("-s, --short", "Short explanation (default)")
    .option("-f, --full", "Full detailed explanation")
    .option("-m, --message", "Generate commit message only")
    .option("-r, --risk", "Risk analysis only")
    .option("--offline", "Use local LLM (offline mode)")
    .option("--model <name>", "Specify LLM model")
    .option("--setup", "Re-run setup wizard")
    .argument("[commit]", "Commit hash to explain")
    .parse(process.argv);

  const opts = program.opts();
  const commit: string | undefined = program.args[0];

  // Re-run setup if requested
  if (opts.setup) {
    await runSetup(true);
    return;
  }

  // Load config, run setup if first time
  let config = loadConfig();
  if (!config) {
    await runSetup();
    config = loadConfig();
    if (!config) {
      console.error("Setup failed. Run `git-explain --setup` to try again.");
      process.exit(1);
    }
  }

  // Override mode/model from CLI flags
  if (opts.offline) config.mode = "offline";
  if (opts.model) config.model = opts.model;

  try {
    let result: DiffResult;
    if (commit) {
      result = getCommitDiff(commit);
    } else if (opts.staged) {
      result = getStagedDiff();
    } else {
      result = getWorkingTreeDiff();
    }

    const { diff, stats, commitInfo } = result;

    if (stats.files === 0 || !diff.trim()) {
      console.log("No changes detected.");
      process.exit(0);
    }

    formatStats(stats.files, stats.insertions, stats.deletions);

    // Gather repository context
    const ctx = gatherContext(diff);

    const maxLen = 15_000;
    const truncated =
      diff.length > maxLen
        ? diff.slice(0, maxLen) + "\n\n... (diff truncated)"
        : diff;

    const llm = await createLLM(config);

    if (opts.message) {
      const { system, prompt } = buildCommitMessagePrompt(truncated, ctx);
      const text = await llm.generate(prompt, system);
      formatCommitMessage(text);
    } else if (opts.risk) {
      const { system, prompt } = buildRiskPrompt(truncated, ctx);
      const text = await llm.generate(prompt, system);
      formatRiskAnalysis(text);
    } else {
      const { system, prompt } = buildComprehensivePrompt(
        truncated,
        ctx,
        commitInfo,
      );
      const text = await llm.generate(prompt, system);
      formatComprehensive(text);
    }
  } catch (err) {
    formatError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
