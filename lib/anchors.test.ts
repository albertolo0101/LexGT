import { describe, it, expect } from "vitest";
import { articleAnchor, sectionAnchor } from "./anchors";

describe("articleAnchor", () => {
  it("keeps plain numbers", () => {
    expect(articleAnchor("42")).toBe("articulo-42");
  });

  it("slugifies suffixed numbers — un id de HTML no admite espacios", () => {
    expect(articleAnchor("326 Bis")).toBe("articulo-326-bis");
    expect(articleAnchor("152 Ter")).toBe("articulo-152-ter");
  });

  it("strips accents and punctuation", () => {
    expect(articleAnchor("15º")).toBe("articulo-15");
    expect(articleAnchor(" 7-A ")).toBe("articulo-7-a");
  });

  it("never produces a bare prefix", () => {
    expect(articleAnchor("—")).toBe("articulo-sn");
  });
});

describe("sectionAnchor", () => {
  it("prefixes the section id", () => {
    expect(sectionAnchor("abc")).toBe("seccion-abc");
  });
});
