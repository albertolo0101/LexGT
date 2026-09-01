import { describe, it, expect, vi } from "vitest";
import type { Ratelimit } from "@upstash/ratelimit";
import { checkRateLimit, RATE_LIMIT_TIMEOUT_MS } from "./rate-limit";

function fakeLimiter(limit: () => Promise<{ success: boolean }>) {
  return { limit } as unknown as Ratelimit;
}

describe("checkRateLimit", () => {
  it("allows everything when no limiter is configured", async () => {
    expect(await checkRateLimit(null, "1.2.3.4")).toBe(true);
  });

  it("passes through the limiter verdict", async () => {
    expect(await checkRateLimit(fakeLimiter(async () => ({ success: true })), "ip")).toBe(true);
    expect(await checkRateLimit(fakeLimiter(async () => ({ success: false })), "ip")).toBe(false);
  });

  it("fails open when the limiter throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const limiter = fakeLimiter(async () => {
      throw new Error("ECONNREFUSED");
    });
    expect(await checkRateLimit(limiter, "ip")).toBe(true);
  });

  // Un Redis muerto le costaba ~4.6 s a cada búsqueda antes de rendirse.
  it("fails open within the timeout budget when Redis hangs", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const limiter = fakeLimiter(() => new Promise(() => {}));

    const started = Date.now();
    const allowed = await checkRateLimit(limiter, "ip");

    expect(allowed).toBe(true);
    expect(Date.now() - started).toBeLessThan(RATE_LIMIT_TIMEOUT_MS + 300);
  });
});
