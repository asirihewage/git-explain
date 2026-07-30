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

    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      const data: TagsResponse = await res.json();
      const exists = data.models?.some(
        (m) => m.name === this.modelName,
      );
      if (exists) {
        this.ready = true;
        return;
      }
    } catch {
      // not reachable
    }

    console.log(`Downloading ${this.modelName} (this may take a while)...`);
    try {
      execSync(`ollama pull ${this.modelName}`, {
        stdio: "inherit",
        timeout: 600_000,
      });
      this.ready = true;
    } catch {
      console.error("Failed to download model. Is Ollama installed? https://ollama.com");
      process.exit(1);
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
