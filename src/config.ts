import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface Config {
  mode: "offline" | "remote";
  provider: "ollama" | "openai" | "anthropic";
  model: string;
  ollamaUrl: string;
  apiKeys: {
    openai: string;
    anthropic: string;
  };
}

const CONFIG_DIR = join(homedir(), ".git-explain");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

const DEFAULTS: Config = {
  mode: "offline",
  provider: "ollama",
  model: "qwen3-coder:latest",
  ollamaUrl: "http://localhost:11434",
  apiKeys: { openai: "", anthropic: "" },
};

export function loadConfig(): Config | null {
  try {
    if (!existsSync(CONFIG_PATH)) return null;
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    return null;
  }
}

export function saveConfig(config: Config): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export function defaultConfig(): Config {
  return { ...DEFAULTS, apiKeys: { ...DEFAULTS.apiKeys } };
}

export function configPath(): string {
  return CONFIG_PATH;
}
