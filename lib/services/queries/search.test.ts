import { describe, it, expect } from "vitest";
import { makeBuilder, makeDb } from "@/lib/test/mock-supabase";
import { searchArticles } from "./search";

describe("searchArticles", () => {
  it("returns empty results when the law filter doesn't match", async () => {
    const db = makeDb([makeBuilder({ data: null, error: null })]);

    const result = await searchArticles(db, { q: "contrato", lawSlug: "missing", limit: 20 });
    expect(result).toEqual({ results: [], total: 0 });
  });

  it("merges article and paragraph matches, deduplicated by article", async () => {
    const articleRows = [
      {
        id: "art1",
        number: "1",
        heading: "Del objeto",
        section_id: "sec1",
        law_id: "law1",
        laws: { slug: "civil", short_name: "CC" },
        paragraphs: [
          { text: "segundo párrafo", position: 2 },
          { text: "primer párrafo", position: 1 },
        ],
      },
    ];
    const paragraphRows = [
      {
        text: "otro contrato",
        article_id: "art2",
        articles: {
          id: "art2",
          number: "2",
          heading: "De las obligaciones",
          section_id: "sec2",
          law_id: "law1",
          is_current: true,
          laws: { slug: "civil", short_name: "CC" },
        },
      },
      {
        text: "duplicado",
        article_id: "art1",
        articles: {
          id: "art1",
          number: "1",
          heading: "Del objeto",
          section_id: "sec1",
          law_id: "law1",
          is_current: true,
          laws: { slug: "civil", short_name: "CC" },
        },
      },
    ];

    const db = makeDb([
      makeBuilder({ data: articleRows, error: null }),
      makeBuilder({ data: paragraphRows, error: null }),
    ]);

    const result = await searchArticles(db, { q: "contrato", lawSlug: null, limit: 20 });

    expect(result.total).toBe(2);
    expect(result.results.map((r) => r.article_id)).toEqual(["art1", "art2"]);
    expect(result.results[0].snippet).toBe("primer párrafo segundo párrafo");
    expect(result.results[1].snippet).toBe("otro contrato");
  });
});
