import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function okJson(body: unknown) {
  return { ok: true, json: async () => body, text: async () => "" };
}

beforeEach(() => {
  mockFetch.mockReset();
});

function mockServer({ healthy = true, models = [] as { id: string }[] } = {}) {
  mockFetch.mockImplementation(async (url: string) => {
    if (url.endsWith("/health")) return { ok: healthy };
    if (url.endsWith("/v1/models")) return okJson({ data: models });
    return okJson({ choices: [{ message: { content: "Hello from llama.cpp" } }] });
  });
}

describe("LlamaCppProvider", () => {
  it("generates content from a running llama-server", async () => {
    mockServer({ models: [{ id: "qwen2.5-coder" }] });

    const { LlamaCppProvider } = await import("../../llm/llamacpp.js");
    const provider = new LlamaCppProvider("local-model", "http://127.0.0.1:8080");

    const result = await provider.generate("Say hello");
    expect(result).toBe("Hello from llama.cpp");

    const chatCall = mockFetch.mock.calls.find((c) =>
      (c[0] as string).endsWith("/v1/chat/completions"),
    );
    expect(chatCall).toBeTruthy();
    const body = JSON.parse(chatCall![1].body);
    expect(body.model).toBe("qwen2.5-coder");
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].content).toBe("Say hello");
  });

  it("falls back to configured model name when /v1/models is empty", async () => {
    mockServer();

    const { LlamaCppProvider } = await import("../../llm/llamacpp.js");
    const provider = new LlamaCppProvider("local-model", "http://127.0.0.1:8080");

    await provider.generate("hi");
    const chatCall = mockFetch.mock.calls.find((c) =>
      (c[0] as string).endsWith("/v1/chat/completions"),
    );
    expect(chatCall).toBeTruthy();
    const body = JSON.parse(chatCall![1].body);
    expect(body.model).toBe("local-model");
  });

  it("includes system message when provided", async () => {
    mockServer();

    const { LlamaCppProvider } = await import("../../llm/llamacpp.js");
    const provider = new LlamaCppProvider("local-model", "http://127.0.0.1:8080");

    await provider.generate("hi", "be concise");
    const chatCall = mockFetch.mock.calls.find((c) =>
      (c[0] as string).endsWith("/v1/chat/completions"),
    );
    expect(chatCall).toBeTruthy();
    const body = JSON.parse(chatCall![1].body);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toBe("be concise");
  });

  it("throws actionable error when server is not running", async () => {
    mockFetch.mockRejectedValue(new Error("connection refused"));

    const { LlamaCppProvider } = await import("../../llm/llamacpp.js");
    const provider = new LlamaCppProvider("local-model", "http://127.0.0.1:8080");

    await expect(provider.generate("test")).rejects.toThrow(/llama\.cpp/);
  });

  it("throws on API error", async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.endsWith("/health")) return { ok: true };
      if (url.endsWith("/v1/models")) return okJson({ data: [] });
      return { ok: false, status: 500, text: async () => "boom" };
    });

    const { LlamaCppProvider } = await import("../../llm/llamacpp.js");
    const provider = new LlamaCppProvider("local-model", "http://127.0.0.1:8080");

    await expect(provider.generate("test")).rejects.toThrow("llama.cpp error 500");
  });
});
