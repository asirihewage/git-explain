import type { LLMProvider } from "./index.js";

export class AnthropicProvider implements LLMProvider {
  readonly modelName: string;
  private apiKey = "";

  constructor(model: string) {
    this.modelName = model;
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  async generate(prompt: string, system?: string): Promise<string> {
    const key = this.apiKey || process.env.ANTHROPIC_API_KEY || "";
    if (!key) {
      console.error("Error: Anthropic API key is required. Set ANTHROPIC_API_KEY or run setup.");
      process.exit(1);
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.modelName,
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Anthropic error ${res.status}: ${body}`);
    }

    const data = await res.json();
    return data.content[0].text;
  }
}
