import { execFileSync } from "node:child_process";
import * as p from "@clack/prompts";
import { loadConfig, saveConfig, defaultConfig, configPath } from "./config.js";
import type { Config } from "./config.js";

interface ModelDef {
  id: string;
  label: string;
  provider: "ollama" | "llamacpp" | "openai" | "anthropic";
  mode: "offline" | "remote";
  hint?: string;
  ollamaModel?: string;
}

const DEFAULT_LLAMACPP_URL = "http://127.0.0.1:8080";

const MODELS: ModelDef[] = [
  { id: "llama-cpp", label: "Llama.cpp", provider: "llamacpp", mode: "offline" },
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

async function isLlamaCppReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function promptLlamaCppModelSource(config: Config): Promise<boolean> {
  const source = await p.select({
    message: "llama-server is not running. How should git-explain load the model?",
    options: [
      { value: "path", label: "Local GGUF file" },
      { value: "hf", label: "Hugging Face repo (auto-download on first run)" },
      { value: "cancel", label: "Cancel" },
    ],
  });
  if (p.isCancel(source) || source === "cancel") return false;

  if (source === "path") {
    const modelPath = await p.text({
      message: "Enter the path to your GGUF model file:",
      validate: (v) => (v ? undefined : "Model path is required"),
    });
    if (p.isCancel(modelPath)) return false;
    config.llamacppModelPath = modelPath as string;
  } else {
    const repo = await p.text({
      message: "Hugging Face repo (e.g. ggml-org/gemma-1.1-2b-it-GGUF):",
      validate: (v) => (v ? undefined : "Repo is required"),
    });
    if (p.isCancel(repo)) return false;
    const file = await p.text({
      message: "GGUF file in the repo (e.g. gemma-1.1-2b-it-Q4_K_M.gguf):",
      validate: (v) => (v ? undefined : "File is required"),
    });
    if (p.isCancel(file)) return false;
    config.llamacppHfRepo = repo as string;
    config.llamacppHfFile = file as string;
  }

  p.note("git-explain will start llama-server automatically on next run", "○");
  return true;
}

export async function runSetup(force = false): Promise<void> {
  const existing = loadConfig();
  if (existing && !force) return;

  p.intro("Welcome to Git Explain!");

  const hasGit = checkInstalled("git");
  const hasLlamaCpp = checkInstalled("llama-server");
  const hasOllama = checkInstalled("ollama");

  if (hasGit) p.note("Git detected", "✓");
  else p.note("Git not found — install from https://git-scm.com", "✗");

  if (hasLlamaCpp) p.note("Llama.cpp detected", "✓");
  else p.note("Llama.cpp not found — install from https://github.com/ggml-org/llama.cpp (needed for Llama.cpp models)", "○");

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
      initialValue: hasLlamaCpp ? "llama-cpp" : "qwen3-coder",
      options: MODELS.map((m) => ({
        value: m.id,
        label: m.label,
        hint:
          m.id === "llama-cpp" && hasLlamaCpp
            ? "recommended"
            : m.id === "qwen3-coder" && !hasLlamaCpp
              ? "recommended"
              : m.hint,
      })),
    });

    if (p.isCancel(selected)) {
      p.outro("Setup cancelled.");
      process.exit(0);
    }

    modelDef = MODELS.find((m) => m.id === selected)!;

    // If offline model but no compatible runtime, offer fallback
    if (modelDef.mode === "offline" && !hasOllama && !hasLlamaCpp) {
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

  if (modelDef.provider === "llamacpp") {
    config.llamacppUrl = DEFAULT_LLAMACPP_URL;
    config.model = "local-model";
    if (!(await isLlamaCppReachable(config.llamacppUrl))) {
      if (!hasLlamaCpp) {
        modelDef = await promptFallbackModel();
        if (!modelDef) {
          p.outro("Setup cancelled.");
          process.exit(0);
        }
        config.provider = modelDef.provider;
        config.model = modelDef.ollamaModel || modelDef.id;
      } else if (!(await promptLlamaCppModelSource(config))) {
        p.outro("Setup cancelled.");
        process.exit(0);
      }
    }
  }

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
