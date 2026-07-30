import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
  delete process.env.ANTHROPIC_API_KEY;
});

describe("AnthropicProvider", () => {
  it("generates content from Anthropic API", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ text: "Hello from Claude" }],
      }),
    });

    const { AnthropicProvider } = await import("../../llm/anthropic.js");
    const provider = new AnthropicProvider("claude-sonnet-4-20250514");
    provider.setApiKey("sk-ant-test");

    const result = await provider.generate("Say hello");
    expect(result).toBe("Hello from Claude");
    expect(mockFetch).toHaveBeenCalledOnce();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe("claude-sonnet-4-20250514");
  });

  it("throws on API error", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => "Forbidden",
    });

    const { AnthropicProvider } = await import("../../llm/anthropic.js");
    const provider = new AnthropicProvider("claude-sonnet-4-20250514");
    provider.setApiKey("sk-ant-test");

    await expect(provider.generate("test")).rejects.toThrow("Anthropic error 403");
  });
});
