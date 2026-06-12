import { describe, it, expect } from "vitest";
import { resolveAnchor, textChecksum } from "./anchoring";

describe("resolveAnchor", () => {
  it("keeps stored offsets when the text checksum is unchanged", async () => {
    const text = "El contrato de arrendamiento debe constar por escrito.";
    const checksum = await textChecksum(text);

    const result = await resolveAnchor(text, {
      char_start: 3,
      char_end: 12,
      quote: "contrato",
      prefix: "El ",
      suffix: " de arren",
      text_checksum: checksum,
    });

    expect(result).toEqual({ start: 3, end: 12, status: "anchored" });
  });

  it("re-anchors when a typo before the quote shifts offsets but the quote survives", async () => {
    const original = "El contrato debe constar por escrito.";
    const edited = "El contratoo debe constar por escrito."; // typo inserted before "debe"
    const originalChecksum = await textChecksum(original);

    // original offsets pointed at "contrato" (3..11)
    const result = await resolveAnchor(edited, {
      char_start: 3,
      char_end: 11,
      quote: "contrato",
      prefix: "El ",
      suffix: " debe",
      text_checksum: originalChecksum,
    });

    expect(result.status).toBe("reanchored");
    expect(edited.slice(result.start, result.end)).toBe("contrato");
  });

  it("marks orphaned when the quote itself was edited away", async () => {
    const original = "El contrato debe constar por escrito.";
    const edited = "El acuerdo debe constar por escrito.";
    const originalChecksum = await textChecksum(original);

    const result = await resolveAnchor(edited, {
      char_start: 3,
      char_end: 11,
      quote: "contrato",
      prefix: "El ",
      suffix: " debe",
      text_checksum: originalChecksum,
    });

    expect(result.status).toBe("orphaned");
  });

  it("disambiguates a duplicate quote using prefix/suffix context", async () => {
    const original = "El contrato anterior y el contrato nuevo coexisten.";
    const edited = "El contratoo anterior y el contrato nuevo coexisten.";
    const originalChecksum = await textChecksum(original);

    // annotation was on the second "contrato" (prefix "el ", suffix " nuevo")
    const result = await resolveAnchor(edited, {
      char_start: 27,
      char_end: 35,
      quote: "contrato",
      prefix: "el ",
      suffix: " nuevo",
      text_checksum: originalChecksum,
    });

    expect(result.status).toBe("reanchored");
    expect(edited.slice(result.start, result.end)).toBe("contrato");
    expect(edited.slice(result.start - 3, result.start)).toBe("el ");
  });
});
