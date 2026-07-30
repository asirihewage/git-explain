import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
  delete process.env.OPENAI_API_KEY;
});

describe("OpenAIProvider", () => {
  it("generates content from OpenAI API", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Hello from GPT" } }],
      }),
    });

    const { OpenAIProvider } = await import("../../llm/openai.js");
    const provider = new OpenAIProvider("gpt-5");
    provider.setApiKey("sk-test");

    const result = await provider.generate("Say hello");
    expect(result).toBe("Hello from GPT");
    expect(mockFetch).toHaveBeenCalledOnce();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe("gpt-5");
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].content).toBe("Say hello");
  });

  it("includes system message when provided", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "ok" } }],
      }),
    });

    const { OpenAIProvider } = await import("../../llm/openai.js");
    const provider = new OpenAIProvider("gpt-5");
    provider.setApiKey("sk-test");

    await provider.generate("hi", "be concise");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toBe("be concise");
  });

  it("throws on API error", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    const { OpenAIProvider } = await import("../../llm/openai.js");
    const provider = new OpenAIProvider("gpt-5");
    provider.setApiKey("sk-test");

    await expect(provider.generate("test")).rejects.toThrow("API error 401");
  });
});
