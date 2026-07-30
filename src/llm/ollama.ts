import { execSync } from "node:child_process";
import type { LLMProvider } from "./index.js";

interface TagsResponse {
  models?: { name: string }[];
}

interface ChatResponse {
  message: { content: string };
}

export class OllamaProvider implements LLMProvider {
  readonly modelName: string;
  private baseUrl: string;
  private ready = false;

  constructor(model: string, ollamaUrl: string) {
    this.modelName = model;
    this.baseUrl = ollamaUrl;
  }

  private async ensureModel(): Promise<void> {
    if (this.ready) return;

    // Check if Ollama is reachable
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
      const data: TagsResponse = await res.json();
      const exists = data.models?.some(
        (m) => m.name === this.modelName,
      );
      if (exists) {
        this.ready = true;
        return;
      }
    } catch {
      throw new Error(
        "Ollama is not running or not reachable.\n" +
        "  Install: https://ollama.com\n" +
        "  Start:   ollama serve\n" +
        "  Or run git-explain --setup to switch to a remote model.",
      );
    }

    // Model not found locally — try to pull it
    console.log(`Downloading ${this.modelName} (this may take a while)...`);
    try {
      execSync(`ollama pull ${this.modelName}`, {
        stdio: "inherit",
        timeout: 600_000,
      });
      this.ready = true;
    } catch {
      throw new Error(
        `Failed to download ${this.modelName}.\n` +
        `  Run manually: ollama pull ${this.modelName}\n` +
        `  Or run git-explain --setup to switch to a remote model.`,
      );
    }
  }

  async generate(prompt: string, system?: string): Promise<string> {
    await this.ensureModel();

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.modelName,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          { role: "user", content: prompt },
        ],
        options: { temperature: 0.3 },
        stream: false,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Ollama error ${res.status}: ${body}`);
    }

    const data: ChatResponse = await res.json();
    return data.message.content;
  }
}
