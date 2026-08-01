import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Config } from "../../config.js";
import { defaultConfig } from "../../config.js";

beforeEach(() => {
  vi.resetModules();
});

function makeConfig(overrides: Partial<Config>): Config {
  return { ...defaultConfig(), ...overrides };
}

describe("createLLM", () => {
  it("creates OllamaProvider for offline mode", async () => {
    const cfg = makeConfig({
      mode: "offline",
      provider: "ollama",
      model: "qwen3-coder:latest",
      ollamaUrl: "http://localhost:11434",
    });

    const { createLLM } = await import("../../llm/index.js");
    const llm = await createLLM(cfg);
    expect(llm.modelName).toBe("qwen3-coder:latest");
  });

  it("creates LlamaCppProvider for llamacpp provider", async () => {
    const cfg = makeConfig({
      mode: "offline",
      provider: "llamacpp",
      model: "local-model",
      llamacppModelPath: "models/qwen2.5-coder.gguf",
    });

    const { createLLM } = await import("../../llm/index.js");
    const llm = await createLLM(cfg);
    expect(llm.modelName).toBe("local-model");
  });

  it("creates OpenAIProvider for remote openai provider", async () => {
    const cfg = makeConfig({
      mode: "remote",
      provider: "openai",
      model: "gpt-5",
      apiKeys: { openai: "sk-test", anthropic: "" },
    });

    const { createLLM } = await import("../../llm/index.js");
    const llm = await createLLM(cfg);
    expect(llm.modelName).toBe("gpt-5");
  });

  it("creates AnthropicProvider for remote anthropic provider", async () => {
    const cfg = makeConfig({
      mode: "remote",
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      apiKeys: { openai: "", anthropic: "sk-ant-test" },
    });

    const { createLLM } = await import("../../llm/index.js");
    const llm = await createLLM(cfg);
    expect(llm.modelName).toBe("claude-sonnet-4-20250514");
  });
});
