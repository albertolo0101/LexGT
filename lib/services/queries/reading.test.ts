import { describe, it, expect } from "vitest";
import type { Actor } from "@/lib/authz";
import { makeBuilder, makeDb } from "@/lib/test/mock-supabase";
import { getLawMeta, getLawToc, getSectionMeta, getSectionReadingBundle } from "./reading";

const anonActor: Actor = { userId: null, tier: "anonymous", isAdmin: false };

describe("getLawMeta", () => {
  it("returns null when the law doesn't exist", async () => {
    const db = makeDb([makeBuilder({ data: null, error: null })]);
    expect(await getLawMeta(db, "missing")).toBeNull();
  });

  it("returns the short name", async () => {
    const db = makeDb([makeBuilder({ data: { short_name: "CC" }, error: null })]);
    expect(await getLawMeta(db, "civil")).toEqual({ shortName: "CC" });
  });
});

describe("getSectionMeta", () => {
  it("returns null when the law or section doesn't exist", async () => {
    const db = makeDb([
      makeBuilder({ data: { short_name: "CC" }, error: null }),
      makeBuilder({ data: null, error: null }),
    ]);
    expect(await getSectionMeta(db, "civil", "sec1")).toBeNull();
  });

  it("returns combined law and section metadata", async () => {
    const db = makeDb([
      makeBuilder({ data: { short_name: "CC" }, error: null }),
      makeBuilder({ data: { heading: "Capítulo 1" }, error: null }),
    ]);
    expect(await getSectionMeta(db, "civil", "sec1")).toEqual({
      lawShortName: "CC",
      sectionHeading: "Capítulo 1",
    });
  });
});

describe("getLawToc", () => {
  it("returns null when the law doesn't exist", async () => {
    const db = makeDb([makeBuilder({ data: null, error: null })]);
    expect(await getLawToc(db, "missing")).toBeNull();
  });

  it("returns a flat article list when the law has no sections", async () => {
    const law = { id: "law1", slug: "decreto", short_name: "Decreto" };
    const db = makeDb([
      makeBuilder({ data: law, error: null }),
      makeBuilder({ data: [], error: null }),
      makeBuilder({ data: [{ id: "art1", number: "1", heading: "Disposición", position: 1 }], error: null }),
    ]);

    const toc = await getLawToc(db, "decreto");
    expect(toc?.law).toEqual(law);
    expect(toc?.tree).toEqual([]);
    expect(toc?.directArticles).toEqual([{ id: "art1", number: "1", heading: "Disposición", position: 1 }]);
  });

  it("builds a section tree", async () => {
    const law = { id: "law1", slug: "civil", short_name: "CC" };
    const sections = [
      { id: "root", law_id: "law1", parent_id: null, kind: "libro", number: "1", heading: "Libro I", position: 1 },
      { id: "child", law_id: "law1", parent_id: "root", kind: "titulo", number: "1", heading: "Título I", position: 1 },
    ];
    const db = makeDb([
      makeBuilder({ data: law, error: null }),
      makeBuilder({ data: sections, error: null }),
    ]);

    const toc = await getLawToc(db, "civil");
    expect(toc?.tree).toHaveLength(1);
    expect(toc?.tree[0].id).toBe("root");
    expect(toc?.tree[0].children).toHaveLength(1);
    expect(toc?.tree[0].children[0].id).toBe("child");
    expect(toc?.directArticles).toEqual([]);
  });
});

describe("getSectionReadingBundle", () => {
  it("returns null when the law or section doesn't exist", async () => {
    const db = makeDb([
      makeBuilder({ data: null, error: null }),
      makeBuilder({ data: null, error: null }),
      makeBuilder({ data: [], error: null }),
    ]);
    expect(await getSectionReadingBundle(db, anonActor, "civil", "sec1")).toBeNull();
  });

  it("assembles the reading bundle for an anonymous visitor", async () => {
    const law = { id: "law1", slug: "civil", short_name: "CC" };
    const section = { id: "sec1", law_id: "law1", parent_id: null, kind: "capitulo", number: "1", heading: "Cap. 1" };

    const db = makeDb([
      makeBuilder({ data: law, error: null }), // laws
      makeBuilder({ data: section, error: null }), // sections (current)
      makeBuilder({ data: [], error: null }), // articles
      makeBuilder({ data: [section], error: null }), // siblings
      makeBuilder({ data: [], error: null }), // law_reforms
      makeBuilder({ data: [], error: null }), // getPendingReforms -> law_reforms
    ]);

    const bundle = await getSectionReadingBundle(db, anonActor, "civil", "sec1");

    expect(bundle?.law).toEqual(law);
    expect(bundle?.section).toEqual(section);
    expect(bundle?.parentSection).toBeNull();
    expect(bundle?.prevSection).toBeNull();
    expect(bundle?.nextSection).toBeNull();
    expect(bundle?.articles).toEqual([]);
    expect(bundle?.articleStubs).toEqual([]);
    expect(bundle?.annotationsByParagraph).toEqual({});
    expect(bundle?.notes).toEqual([]);
    expect(bundle?.reforms).toEqual([]);
    expect(bundle?.hasUnseenReform).toBe(false);
    expect(bundle?.isAuthenticated).toBe(false);
  });
});
