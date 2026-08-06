import { execFileSync } from "node:child_process";
import * as p from "@clack/prompts";
import { loadConfig, saveConfig, defaultConfig, configPath } from "./config.js";
import type { Config } from "./config.js";

interface ModelDef {
  id: string;
  label: string;
  provider: "ollama" | "openai" | "anthropic";
  mode: "offline" | "remote";
  hint?: string;
  ollamaModel?: string;
}

const MODELS: ModelDef[] = [
  { id: "qwen3-coder", label: "Qwen3-Coder", provider: "ollama", mode: "offline", ollamaModel: "qwen3-coder:latest" },
  { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash", provider: "ollama", mode: "offline", ollamaModel: "deepseek-v4-flash:latest" },
  { id: "gpt-5", label: "GPT-5", provider: "openai", mode: "remote", hint: "requires API key" },
  { id: "claude", label: "Claude", provider: "anthropic", mode: "remote", hint: "requires API key" },
];

function checkInstalled(cmd: string): boolean {
  try {
    execFileSync(cmd, ["--version"], { stdio: "ignore", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function handleApiKey(config: Config, provider: "openai" | "anthropic"): Promise<void> {
  const label = provider === "openai" ? "OpenAI" : "Anthropic";
  const key = await p.text({
    message: `Enter your ${label} API key:`,
    validate: (v) => (v ? undefined : "API key is required"),
  });
  if (p.isCancel(key)) process.exit(0);
  config.apiKeys[provider] = key as string;
}

async function promptFallbackModel(): Promise<ModelDef | null> {
  const choice = await p.select({
    message: "No local model runtime is available. Choose an alternative:",
    options: [
      { value: "gpt-5", label: "GPT-5", hint: "requires OpenAI API key" },
      { value: "claude", label: "Claude", hint: "requires Anthropic API key" },
      { value: "cancel", label: "Cancel setup" },
    ],
  });
  if (p.isCancel(choice) || choice === "cancel") return null;
  return MODELS.find((m) => m.id === choice)!;
}

export async function runSetup(force = false): Promise<void> {
  const existing = loadConfig();
  if (existing && !force) return;

  p.intro("Welcome to Git Explain!");

  const hasGit = checkInstalled("git");
  const hasOllama = checkInstalled("ollama");

  if (hasGit) p.note("Git detected", "✓");
  else p.note("Git not found — install from https://git-scm.com", "✗");

  if (hasOllama) p.note("Ollama detected", "✓");
  else p.note("Ollama not found — install from https://ollama.com (needed for Ollama models)", "○");

  if (!hasGit) {
    p.outro("Setup cancelled — Git is required.");
    process.exit(1);
  }

  let modelDef: ModelDef | null = null;

  while (!modelDef) {
    const selected = await p.select({
      message: "Select AI model:",
      initialValue: "qwen3-coder",
      options: MODELS.map((m) => ({
        value: m.id,
        label: m.label,
        hint: m.id === "qwen3-coder" ? "recommended" : m.hint,
      })),
    });

    if (p.isCancel(selected)) {
      p.outro("Setup cancelled.");
      process.exit(0);
    }

    modelDef = MODELS.find((m) => m.id === selected)!;

    // If offline model but no Ollama, offer fallback
    if (modelDef.mode === "offline" && !hasOllama) {
      modelDef = await promptFallbackModel();
      if (!modelDef) {
        p.outro("Setup cancelled.");
        process.exit(0);
      }
    }
  }

  const config = existing || defaultConfig();

  config.mode = modelDef.mode;
  config.provider = modelDef.provider;
  config.model = modelDef.ollamaModel || modelDef.id;

  if (modelDef.provider === "ollama") {
    const spinner = p.spinner();
    spinner.start(`Downloading ${modelDef.label}...`);
    try {
      execFileSync("ollama", ["pull", modelDef.ollamaModel!], {
        stdio: "pipe",
        timeout: 600_000,
      });
      spinner.stop(`${modelDef.label} downloaded successfully`);
    } catch {
      spinner.stop("Download failed");
      const retry = await p.confirm({
        message: `Failed to download ${modelDef.label}. Try again?`,
      });
      if (p.isCancel(retry) || !retry) {
        p.outro(`Run \`ollama pull ${modelDef.ollamaModel}\` manually and run \`git-explain --setup\` to reconfigure.`);
        process.exit(0);
      }
      return runSetup(force);
    }
  }

  if (modelDef.provider === "openai") await handleApiKey(config, "openai");
  if (modelDef.provider === "anthropic") await handleApiKey(config, "anthropic");

  saveConfig(config);
  p.outro(`Setup complete! Config saved to ${configPath()}`);
}
