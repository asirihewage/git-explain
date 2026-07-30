import { execFileSync } from "node:child_process";
import * as p from "@clack/prompts";
import { loadConfig, saveConfig, defaultConfig, configPath } from "./config.js";

interface ModelDef {
  id: string;
  label: string;
  provider: "ollama" | "openai" | "anthropic";
  mode: "offline" | "remote";
  hint?: string;
  ollamaModel?: string;
}

const MODELS: ModelDef[] = [
  { id: "qwen3-coder", label: "Qwen3-Coder", provider: "ollama", mode: "offline", hint: "recommended", ollamaModel: "qwen3-coder:latest" },
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

export async function runSetup(force = false): Promise<void> {
  const existing = loadConfig();
  if (existing && !force) return;

  p.intro("Welcome to Git Explain!");

  const hasGit = checkInstalled("git");
  const hasOllama = checkInstalled("ollama");

  if (hasGit) p.note("Git detected", "✓");
  else p.note("Git not found — install from https://git-scm.com", "✗");

  if (hasOllama) p.note("Ollama detected", "✓");
  else p.note("Ollama not found — install from https://ollama.com (needed for offline models)", "○");

  if (!hasGit) {
    p.outro("Setup cancelled — Git is required.");
    process.exit(1);
  }

  const selected = await p.select({
    message: "Select AI model:",
    initialValue: "qwen3-coder",
    options: MODELS.map((m) => ({
      value: m.id,
      label: m.label,
      hint: m.hint,
    })),
  });

  if (p.isCancel(selected)) {
    p.outro("Setup cancelled.");
    process.exit(0);
  }

  const modelDef = MODELS.find((m) => m.id === selected)!;
  const config = existing || defaultConfig();

  config.mode = modelDef.mode;
  config.provider = modelDef.provider;
  config.model = modelDef.ollamaModel || modelDef.id;

  if (modelDef.mode === "offline") {
    if (!hasOllama) {
      p.note(
        "Ollama is required for offline models.\nInstall from https://ollama.com then run setup again.",
        "Ollama not found",
      );
      process.exit(1);
    }

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
      p.note(
        `Run \`ollama pull ${modelDef.ollamaModel}\` manually and try again.`,
        "Error",
      );
      process.exit(1);
    }
  }

  if (modelDef.provider === "openai") {
    const key = await p.text({
      message: "Enter your OpenAI API key:",
      validate: (v) => (v ? undefined : "API key is required"),
    });
    if (p.isCancel(key)) process.exit(0);
    config.apiKeys.openai = key as string;
  }

  if (modelDef.provider === "anthropic") {
    const key = await p.text({
      message: "Enter your Anthropic API key:",
      validate: (v) => (v ? undefined : "API key is required"),
    });
    if (p.isCancel(key)) process.exit(0);
    config.apiKeys.anthropic = key as string;
  }

  saveConfig(config);
  p.outro(`Setup complete! Config saved to ${configPath()}`);
}
