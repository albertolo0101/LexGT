import { describe, it, expect } from "vitest";
import { buildSegments } from "./segments";
import type { Annotation } from "@/lib/types";

function ann(partial: Partial<Annotation>): Annotation {
  return {
    id: "a",
    user_id: "u",
    paragraph_id: "p",
    article_id: "art",
    color: "yellow",
    char_start: 0,
    char_end: 0,
    note: null,
    quote: null,
    prefix: null,
    suffix: null,
    text_checksum: null,
    anchor_status: "anchored",
    is_pinned_to_old_version: false,
    created_at: "",
    updated_at: "",
    ...partial,
  } as Annotation;
}

const TEXT = "El presente Código regula los derechos y obligaciones.";

describe("buildSegments", () => {
  it("returns a single text segment when there are no annotations", () => {
    expect(buildSegments(TEXT, [])).toEqual([{ kind: "text", text: TEXT }]);
  });

  it("splits the text around a highlight", () => {
    const segments = buildSegments(TEXT, [ann({ id: "h1", char_start: 12, char_end: 18, color: "green" })]);

    expect(segments).toEqual([
      { kind: "text", text: "El presente " },
      { kind: "mark", text: "Código", annotationId: "h1", color: "green" },
      { kind: "text", text: " regula los derechos y obligaciones." },
    ]);
    // El texto renderizado debe seguir siendo idéntico al de la base: los
    // offsets de las anotaciones se cuentan sobre él.
    expect(segments.map((s) => s.text).join("")).toBe(TEXT);
  });

  it("keeps highlights in order and never overlaps them", () => {
    const segments = buildSegments(TEXT, [
      ann({ id: "h2", char_start: 19, char_end: 25 }),
      ann({ id: "h1", char_start: 0, char_end: 11 }),
      // Solapada con h1: se recorta en vez de duplicar texto.
      ann({ id: "h3", char_start: 5, char_end: 9 }),
    ]);

    expect(segments.filter((s) => s.kind === "mark").map((s) => s.annotationId)).toEqual(["h1", "h2"]);
    expect(segments.map((s) => s.text).join("")).toBe(TEXT);
  });

  it("clamps an annotation that runs past the end of the text", () => {
    const segments = buildSegments("Corto.", [ann({ id: "h1", char_start: 0, char_end: 999 })]);

    expect(segments).toEqual([{ kind: "mark", text: "Corto.", annotationId: "h1", color: "yellow" }]);
  });
});
