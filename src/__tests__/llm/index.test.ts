import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Config } from "../../config.js";

beforeEach(() => {
  vi.resetModules();
});

describe("createLLM", () => {
  it("creates OllamaProvider for offline mode", async () => {
    const cfg: Config = {
      mode: "offline",
      provider: "ollama",
      model: "qwen3-coder:latest",
      ollamaUrl: "http://localhost:11434",
      apiKeys: { openai: "", anthropic: "" },
    };

    const { createLLM } = await import("../../llm/index.js");
    const llm = await createLLM(cfg);
    expect(llm.modelName).toBe("qwen3-coder:latest");
  });

  it("creates OpenAIProvider for remote openai provider", async () => {
    const cfg: Config = {
      mode: "remote",
      provider: "openai",
      model: "gpt-5",
      ollamaUrl: "",
      apiKeys: { openai: "sk-test", anthropic: "" },
    };

    const { createLLM } = await import("../../llm/index.js");
    const llm = await createLLM(cfg);
    expect(llm.modelName).toBe("gpt-5");
  });

  it("creates AnthropicProvider for remote anthropic provider", async () => {
    const cfg: Config = {
      mode: "remote",
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      ollamaUrl: "",
      apiKeys: { openai: "", anthropic: "sk-ant-test" },
    };

    const { createLLM } = await import("../../llm/index.js");
    const llm = await createLLM(cfg);
    expect(llm.modelName).toBe("claude-sonnet-4-20250514");
  });
});
