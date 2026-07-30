import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatStats, formatError } from "../output.js";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("formatStats", () => {
  it("logs formatted stats", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    formatStats(3, 15, 7);
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain("Files: 3");
    expect(spy.mock.calls[0][0]).toContain("+15");
    expect(spy.mock.calls[0][0]).toContain("/ -7");
  });
});

describe("formatError", () => {
  it("logs error message to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    formatError("something broke");
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain("something broke");
  });
});
