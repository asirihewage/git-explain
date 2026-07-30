import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExistsSync = vi.fn();
const mockMkdirSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockWriteFileSync = vi.fn();

vi.mock("node:fs", () => ({
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("config module", () => {
  it("loadConfig returns null when config file does not exist", async () => {
    mockExistsSync.mockReturnValue(false);

    const { loadConfig } = await import("../config.js");
    expect(loadConfig()).toBeNull();
    expect(mockExistsSync).toHaveBeenCalled();
  });

  it("loadConfig returns parsed config when file exists", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ model: "test:latest", mode: "offline" }));

    const { loadConfig } = await import("../config.js");
    const cfg = loadConfig();
    expect(cfg).not.toBeNull();
    expect(cfg!.model).toBe("test:latest");
  });

  it("saveConfig writes config to disk", async () => {
    mockExistsSync.mockReturnValue(true);

    const { saveConfig, defaultConfig } = await import("../config.js");
    const cfg = defaultConfig();
    saveConfig(cfg);

    expect(mockWriteFileSync).toHaveBeenCalledOnce();
    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
    expect(written.model).toBe("qwen3-coder:latest");
  });

  it("saveConfig creates directory if missing", async () => {
    mockExistsSync.mockReturnValue(false);

    const { saveConfig, defaultConfig } = await import("../config.js");
    const cfg = defaultConfig();
    saveConfig(cfg);

    expect(mockMkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    expect(mockWriteFileSync).toHaveBeenCalledOnce();
  });

  it("loadConfig returns null on parse error", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("invalid json");

    const { loadConfig } = await import("../config.js");
    expect(loadConfig()).toBeNull();
  });

  it("defaultConfig returns a fresh deep copy", async () => {
    const { defaultConfig } = await import("../config.js");
    const a = defaultConfig();
    const b = defaultConfig();
    expect(a).toEqual(b);
    a.model = "changed";
    expect(b.model).not.toBe("changed");
  });

  it("configPath returns the expected path", async () => {
    const { configPath } = await import("../config.js");
    const path = configPath();
    expect(path).toContain(".git-explain");
    expect(path).toContain("config.json");
  });
});
