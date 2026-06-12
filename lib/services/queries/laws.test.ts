import { describe, it, expect } from "vitest";
import type { Actor } from "@/lib/authz";
import { makeBuilder, makeDb } from "@/lib/test/mock-supabase";
import { getLawCatalog } from "./laws";

const anonActor: Actor = { userId: null, tier: "anonymous", isAdmin: false };

describe("getLawCatalog", () => {
  it("returns an empty catalog when there are no active laws", async () => {
    const lawsSelect = makeBuilder({ data: [], error: null });
    const reformsSelect = makeBuilder({ data: [], error: null });
    const db = makeDb([lawsSelect, reformsSelect]);

    const result = await getLawCatalog(db, anonActor);

    expect(result).toEqual({
      laws: [],
      reformsByLaw: {},
      articleCounts: {},
      articlePairsByReform: {},
      totalPending: 0,
    });
  });

  it("includes article counts per law", async () => {
    const lawsSelect = makeBuilder({
      data: [{ id: "law1", short_name: "CC", is_active: true }],
      error: null,
    });
    const reformsSelect = makeBuilder({ data: [], error: null });
    const articlesCount = makeBuilder({ data: null, error: null, count: 42 } as { data: null; error: null; count: number });
    const db = makeDb([lawsSelect, reformsSelect, articlesCount]);

    const result = await getLawCatalog(db, anonActor);

    expect(result.laws).toEqual([{ id: "law1", short_name: "CC", is_active: true }]);
    expect(result.articleCounts).toEqual({ law1: 42 });
    expect(result.articlePairsByReform).toEqual({});
    expect(result.totalPending).toBe(0);
  });
});
