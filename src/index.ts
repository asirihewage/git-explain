import { Command } from "commander";
import { readFileSync } from "node:fs";

const VERSION = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8"),
).version;
import { loadConfig, saveConfig } from "./config.js";
import type { Config } from "./config.js";
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
import * as p from "@clack/prompts";

async function runWithConfig(
  config: Config,
  opts: Record<string, unknown>,
  commit?: string,
): Promise<void> {
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
  const ctx = gatherContext(diff);

  const maxLen = 15_000;
  const truncated =
    diff.length > maxLen
      ? diff.slice(0, maxLen) + "\n\n... (diff truncated)"
      : diff;

  const detail: "short" | "full" = opts.full ? "full" : "short";

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
}

async function promptRemoteFallback(config: Config): Promise<Config | null> {
  const switchModel = await p.confirm({
    message:
      "Your local model provider is not available. Would you like to switch to a remote model (GPT-5 or Claude)?",
  });

  if (p.isCancel(switchModel) || !switchModel) return null;

  const choice = await p.select({
    message: "Select remote model:",
    options: [
      { value: "openai", label: "GPT-5", hint: "requires OpenAI API key" },
      { value: "anthropic", label: "Claude", hint: "requires Anthropic API key" },
    ],
  });

  if (p.isCancel(choice)) return null;

  const provider = choice as "openai" | "anthropic";
  config.provider = provider;
  config.mode = "remote";
  config.model = provider === "openai" ? "gpt-5" : "claude-sonnet-4-20250514";

  const key = await p.text({
    message: `Enter your ${provider === "openai" ? "OpenAI" : "Anthropic"} API key:`,
    validate: (v) => (v ? undefined : "API key is required"),
  });

  if (p.isCancel(key)) return null;
  config.apiKeys[provider] = key as string;
  saveConfig(config);

  return config;
}

async function main() {
  const program = new Command();

  program
    .name("git-explain")
    .description("AI-powered Git change explanations")
    .version(VERSION)
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

  if (opts.setup) {
    await runSetup(true);
    return;
  }

  let config = loadConfig();
  if (!config) {
    await runSetup();
    config = loadConfig();
    if (!config) {
      console.error("Setup failed. Run `git-explain --setup` to try again.");
      process.exit(1);
    }
  }

  if (opts.offline) config.mode = "offline";
  if (opts.model) config.model = opts.model;

  try {
    await runWithConfig(config, opts, commit);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    // If offline/local provider failed, offer to fallback to remote
    if (
      config.mode === "offline" &&
      (config.provider === "ollama" || config.provider === "llamacpp")
    ) {
      formatError(msg);
      console.log();
      const updated = await promptRemoteFallback(config);
      if (!updated) {
        console.log("You can re-run setup with: git-explain --setup");
        process.exit(1);
      }
      // Retry with new config
      try {
        await runWithConfig(updated, opts, commit);
      } catch (retryErr) {
        formatError(
          retryErr instanceof Error ? retryErr.message : String(retryErr),
        );
        process.exit(1);
      }
    } else {
      formatError(msg);
      process.exit(1);
    }
  }
}

main();
