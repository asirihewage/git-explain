import type { Config } from "../config.js";

export interface LLMProvider {
  generate(prompt: string, system?: string): Promise<string>;
  readonly modelName: string;
}

export async function createLLM(config: Config): Promise<LLMProvider> {
  if (config.provider === "ollama") {
    const { OllamaProvider } = await import("./ollama.js");
    return new OllamaProvider(config.model, config.ollamaUrl);
  }
  if (config.provider === "anthropic") {
    const { AnthropicProvider } = await import("./anthropic.js");
    const provider = new AnthropicProvider(config.model);
    provider.setApiKey(config.apiKeys.anthropic);
    return provider;
  }
  // default: openai-compatible
  const { OpenAIProvider } = await import("./openai.js");
  const provider = new OpenAIProvider(config.model);
  provider.setApiKey(config.apiKeys.openai);
  return provider;
}
