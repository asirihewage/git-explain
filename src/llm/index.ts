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
  if (config.provider === "llamacpp") {
    const { LlamaCppProvider } = await import("./llamacpp.js");
    const url =
      process.env.LLAMACPP_URL || config.llamacppUrl || "http://127.0.0.1:8080";
    return new LlamaCppProvider(config.model, url, {
      modelPath: config.llamacppModelPath || undefined,
      hfRepo: config.llamacppHfRepo || undefined,
      hfFile: config.llamacppHfFile || undefined,
    });
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
