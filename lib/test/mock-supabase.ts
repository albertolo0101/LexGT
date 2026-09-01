import { vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

// Chainable query-builder mock. Each call to `db.from(...)` (or `db.rpc(...)`)
// pops the next queued builder, so tests order their expected results to
// match the sequence of calls made by the service under test.
export function makeBuilder(result: { data?: unknown; error?: unknown } = { data: null, error: null }) {
  const builder: Record<string, unknown> = {};
  const chain = ["insert", "update", "delete", "upsert", "select", "eq", "order", "limit", "in", "not", "is", "gte", "lte", "or", "ilike", "range", "textSearch"];
  for (const method of chain) {
    builder[method] = vi.fn(() => builder);
  }
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve: (value: typeof result) => unknown) => resolve(result);
  return builder;
}

export function makeDb(builders: ReturnType<typeof makeBuilder>[], rpcResult?: { data?: unknown; error?: unknown }) {
  const queue = [...builders];
  const from = vi.fn(() => queue.shift());
  const rpc = vi.fn(() => Promise.resolve(rpcResult ?? { data: null, error: null }));
  return { from, rpc } as unknown as SupabaseClient;
}
