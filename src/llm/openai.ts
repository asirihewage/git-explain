import type { LLMProvider } from "./index.js";

export class OpenAIProvider implements LLMProvider {
  readonly modelName: string;
  private apiKey = "";
  private baseUrl: string;

  constructor(model: string) {
    this.modelName = model;
    this.baseUrl =
      process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  async generate(prompt: string, system?: string): Promise<string> {
    const key = this.apiKey || process.env.OPENAI_API_KEY || "";
    if (!key) {
      console.error("Error: OpenAI API key is required. Set OPENAI_API_KEY or run setup.");
      process.exit(1);
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: [
          ...(system ? [{ role: "system" as const, content: system }] : []),
          { role: "user" as const, content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API error ${res.status}: ${body}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  }
}
