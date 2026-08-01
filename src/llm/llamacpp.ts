import { execSync, spawn } from "node:child_process";
import type { LLMProvider } from "./index.js";

interface ChatResponse {
  choices?: { message?: { content?: string } }[];
}

export interface LlamaCppOptions {
  modelPath?: string;
  hfRepo?: string;
  hfFile?: string;
}

const HEALTH_TIMEOUT_MS = 120_000;

export class LlamaCppProvider implements LLMProvider {
  readonly modelName: string;
  private baseUrl: string;
  private options: LlamaCppOptions;
  private ready = false;
  private resolvedModel?: string;

  constructor(model: string, baseUrl: string, options: LlamaCppOptions = {}) {
    this.modelName = model;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.options = options;
  }

  private async isHealthy(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private isServerInstalled(): boolean {
    try {
      execSync("llama-server --version", { stdio: "ignore", timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  private async startServer(): Promise<boolean> {
    const args = [
      "--host", "127.0.0.1",
      "--port", String(new URL(this.baseUrl).port || 8080),
      "--no-webui",
    ];
    if (this.options.modelPath) {
      args.push("--model", this.options.modelPath);
    } else {
      args.push(
        "--hf-repo", this.options.hfRepo!,
        "--hf-file", this.options.hfFile!,
      );
    }

    const child = spawn("llama-server", args, {
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    const deadline = Date.now() + HEALTH_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (await this.isHealthy()) return true;
    }
    return false;
  }

  private async ensureServer(): Promise<void> {
    if (this.ready) return;

    if (await this.isHealthy()) {
      this.ready = true;
      return;
    }

    if (
      this.isServerInstalled() &&
      (this.options.modelPath ||
        (this.options.hfRepo && this.options.hfFile))
    ) {
      console.log("Starting llama-server...");
      if (await this.startServer()) {
        this.ready = true;
        return;
      }
      throw new Error(
        "llama-server started but did not become healthy.\n" +
        "  Check the model file: " +
        (this.options.modelPath || `${this.options.hfRepo}/${this.options.hfFile}`) +
        "\n  Or run git-explain --setup to reconfigure.",
      );
    }

    throw new Error(
      "llama.cpp server is not running.\n" +
      "  Install: https://github.com/ggml-org/llama.cpp\n" +
      "  Start:   llama-server --model /path/to/model.gguf\n" +
      "  Or run git-explain --setup to switch to another model.",
    );
  }

  private async resolveModel(): Promise<string> {
    if (this.resolvedModel) return this.resolvedModel;
    try {
      const res = await fetch(`${this.baseUrl}/v1/models`);
      if (res.ok) {
        const data = (await res.json()) as { data?: { id?: string }[] };
        const id = data.data?.find((m) => m.id)?.id;
        if (id) {
          this.resolvedModel = id;
          return id;
        }
      }
    } catch {
      // fall through to configured model name
    }
    return this.modelName;
  }

  async generate(prompt: string, system?: string): Promise<string> {
    await this.ensureServer();

    const model = await this.resolveModel();
    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        stream: false,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`llama.cpp error ${res.status}: ${body}`);
    }

    const data: ChatResponse = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("llama.cpp returned an empty response.");
    return content;
  }
}
