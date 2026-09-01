import { describe, it, expect } from "vitest";
import type { Actor } from "@/lib/authz";
import { makeBuilder, makeDb } from "@/lib/test/mock-supabase";
import { getLawContent, getLawMeta, getLawUserLayer, type LawContent } from "./reading";

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

describe("getLawContent", () => {
  const law = { id: "law1", slug: "civil", short_name: "CC", decree: "Decreto 106" };

  // Datos con la forma que produce el extractor: `number` ya trae la palabra del
  // tipo, `heading` a veces viene vacío, y `sections.position` NO refleja el
  // orden de lectura (cap2 tiene position 3 pero sus artículos van después).
  const sections = [
    { id: "libro1", parent_id: null, kind: "libro", number: "LIBRO PRIMERO", heading: "DE LAS PERSONAS", position: 1 },
    { id: "cap1", parent_id: "libro1", kind: "capitulo", number: "CAPITULO I", heading: "", position: 5 },
    { id: "cap2", parent_id: "libro1", kind: "capitulo", number: "CAPITULO II", heading: "DE LAS JURIDICAS", position: 3 },
  ];
  const articles = [
    { id: "a1", number: "1", heading: null, position: 1, section_id: "cap1" },
    { id: "a2", number: "2", heading: "Capacidad", position: 2, section_id: "cap1" },
    { id: "a3", number: "3", heading: null, position: 3, section_id: "cap2" },
    { id: "a4", number: "4 Bis", heading: null, position: 4, section_id: null },
  ];
  const paragraphs = [
    { id: "p1", article_id: "a1", position: 1, text: "Texto uno." },
    { id: "p2", article_id: "a1", position: 2, text: "Texto uno, segundo párrafo." },
    { id: "p3", article_id: "a2", position: 1, text: "Texto dos." },
  ];

  const contentDb = () =>
    makeDb([
      makeBuilder({ data: law, error: null }), // laws
      makeBuilder({ data: sections, error: null }), // sections
      makeBuilder({ data: articles, error: null }), // articles
      makeBuilder({ data: paragraphs, error: null }), // paragraphs
    ]);

  it("returns null when the law doesn't exist", async () => {
    const db = makeDb([makeBuilder({ data: null, error: null })]);
    expect(await getLawContent(db, "missing")).toBeNull();
  });

  it("orders the document by article position and emits each section header once", async () => {
    const content = await getLawContent(contentDb(), "civil");

    expect(
      content!.nodes.map((n) => (n.kind === "section" ? `S:${n.id}` : `A:${n.article.number}`))
    ).toEqual(["S:libro1", "S:cap1", "A:1", "A:2", "S:cap2", "A:3", "A:4 Bis"]);
  });

  it("builds a table of contents in document order, with depth and clean labels", async () => {
    const content = await getLawContent(contentDb(), "civil");

    expect(content!.toc).toEqual([
      { id: "libro1", anchor: "seccion-libro1", label: "LIBRO PRIMERO", heading: "DE LAS PERSONAS", depth: 0 },
      // Sin heading, el número ES el título: no se repite como rótulo.
      { id: "cap1", anchor: "seccion-cap1", label: "", heading: "CAPITULO I", depth: 1 },
      { id: "cap2", anchor: "seccion-cap2", label: "CAPITULO II", heading: "DE LAS JURIDICAS", depth: 1 },
    ]);
  });

  it("attaches paragraphs to their article and slugifies the anchor", async () => {
    const content = await getLawContent(contentDb(), "civil");
    const articleNodes = content!.nodes.filter((n) => n.kind === "article");

    expect(articleNodes[0]).toMatchObject({
      article: {
        id: "a1",
        anchor: "articulo-1",
        paragraphs: [
          { id: "p1", text: "Texto uno." },
          { id: "p2", text: "Texto uno, segundo párrafo." },
        ],
      },
    });
    // Un artículo sin párrafos (hueco de extracción) no rompe el documento.
    expect(articleNodes[3]).toMatchObject({ article: { anchor: "articulo-4-bis", paragraphs: [] } });
    expect(content!.articleCount).toBe(4);
  });
});

describe("getLawUserLayer", () => {
  const content: LawContent = {
    law: { id: "law1", slug: "civil", short_name: "CC" } as LawContent["law"],
    nodes: [
      {
        kind: "article",
        article: { id: "a1", number: "1", heading: null, anchor: "articulo-1", paragraphs: [{ id: "p1", text: "Texto." }] },
      },
    ],
    toc: [],
    articleCount: 1,
  };

  it("returns an empty layer for an anonymous visitor without querying annotations", async () => {
    const db = makeDb([
      makeBuilder({ data: [], error: null }), // law_reforms
      makeBuilder({ data: [], error: null }), // getPendingReforms -> law_reforms
    ]);

    const layer = await getLawUserLayer(db, anonActor, content);

    expect(layer.annotationsByParagraph).toEqual({});
    expect(layer.notes).toEqual([]);
    expect(layer.orphanedAnnotations).toEqual([]);
    expect(layer.reforms).toEqual([]);
    expect(layer.hasUnseenReform).toBe(false);
    expect(layer.isAuthenticated).toBe(false);
  });
});
