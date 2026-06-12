import type { AnchorStatus } from "@/lib/types";

// Must match the SQL backfill in 0014_annotation_anchors.sql:
// encode(sha256(convert_to(text, 'UTF8')), 'hex')
export async function textChecksum(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const ANCHOR_CONTEXT_LENGTH = 32;

export type AnchorInput = {
  char_start: number;
  char_end: number;
  quote: string | null;
  prefix: string | null;
  suffix: string | null;
  text_checksum: string | null;
};

export type AnchorResult = {
  start: number;
  end: number;
  status: AnchorStatus;
};

// Resolves an annotation's offsets against the current paragraph text:
// a) checksum unchanged -> stored offsets are still valid ("anchored")
// b) checksum changed but prefix+quote+suffix (or quote alone, if unique)
//    still appears -> re-derive offsets ("reanchored")
// c) otherwise -> the highlighted text is gone ("orphaned")
export async function resolveAnchor(paragraphText: string, ann: AnchorInput): Promise<AnchorResult> {
  if (ann.text_checksum != null) {
    const checksum = await textChecksum(paragraphText);
    if (checksum === ann.text_checksum) {
      return { start: ann.char_start, end: ann.char_end, status: "anchored" };
    }
  }

  if (!ann.quote) {
    return { start: ann.char_start, end: ann.char_end, status: "orphaned" };
  }

  if (ann.prefix != null && ann.suffix != null) {
    const combined = ann.prefix + ann.quote + ann.suffix;
    const start = findUniqueIndex(paragraphText, combined);
    if (start !== null) {
      const matchStart = start + ann.prefix.length;
      return { start: matchStart, end: matchStart + ann.quote.length, status: "reanchored" };
    }
  }

  const start = findUniqueIndex(paragraphText, ann.quote);
  if (start !== null) {
    return { start, end: start + ann.quote.length, status: "reanchored" };
  }

  return { start: ann.char_start, end: ann.char_end, status: "orphaned" };
}

function findUniqueIndex(haystack: string, needle: string): number | null {
  const first = haystack.indexOf(needle);
  if (first === -1) return null;
  if (haystack.indexOf(needle, first + 1) !== -1) return null;
  return first;
}
