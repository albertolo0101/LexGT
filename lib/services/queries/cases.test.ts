import { describe, it, expect } from "vitest";
import type { Actor } from "@/lib/authz";
import { AuthzError } from "@/lib/authz";
import { ActionError } from "@/lib/action-result";
import { makeBuilder, makeDb } from "@/lib/test/mock-supabase";
import { listCases, getCaseDetail } from "./cases";

const proActor: Actor = { userId: "user-1", tier: "pro", isAdmin: false };
const freeActor: Actor = { userId: "user-2", tier: "free", isAdmin: false };

describe("listCases", () => {
  it("rejects free users", async () => {
    const db = makeDb([]);
    await expect(listCases(db, freeActor)).rejects.toBeInstanceOf(AuthzError);
  });

  it("maps case_annotations to an annotation_count", async () => {
    const db = makeDb([
      makeBuilder({
        data: [
          {
            id: "case-1",
            user_id: "user-1",
            title: "Caso 1",
            description: null,
            color: "gray",
            created_at: "2026-01-01",
            updated_at: "2026-01-02",
            case_annotations: [{ id: "ca-1" }, { id: "ca-2" }],
          },
        ],
        error: null,
      }),
    ]);

    const result = await listCases(db, proActor);

    expect(result).toEqual([
      {
        id: "case-1",
        user_id: "user-1",
        title: "Caso 1",
        description: null,
        color: "gray",
        created_at: "2026-01-01",
        updated_at: "2026-01-02",
        annotation_count: 2,
      },
    ]);
  });
});

describe("getCaseDetail", () => {
  it("rejects free users", async () => {
    const db = makeDb([]);
    await expect(getCaseDetail(db, freeActor, "case-1")).rejects.toBeInstanceOf(AuthzError);
  });

  it("throws NOT_FOUND when the case doesn't exist or isn't owned by the user", async () => {
    const db = makeDb([makeBuilder({ data: null, error: null })]);
    await expect(getCaseDetail(db, proActor, "missing")).rejects.toBeInstanceOf(ActionError);
  });

  it("computes excerpts and flags migrated annotations", async () => {
    const db = makeDb([
      makeBuilder({
        data: {
          id: "case-1",
          user_id: "user-1",
          title: "Caso 1",
          description: null,
          color: "gray",
          created_at: "2026-01-01",
          updated_at: "2026-01-02",
          case_annotations: [
            {
              id: "ca-1",
              annotations: {
                id: "ann-1",
                color: "yellow",
                note: null,
                char_start: 0,
                char_end: 5,
                paragraphs: { text: "Hola mundo" },
                articles: { number: "1", heading: "Disposiciones generales" },
              },
            },
            {
              id: "ca-2",
              annotations: {
                id: "ann-2",
                color: "pink",
                note: "migrado",
                char_start: 0,
                char_end: 0,
                paragraphs: { text: "Texto nuevo" },
                articles: null,
              },
            },
          ],
        },
        error: null,
      }),
    ]);

    const result = await getCaseDetail(db, proActor, "case-1");

    expect(result.id).toBe("case-1");
    expect(result.annotations).toEqual([
      {
        id: "ca-1",
        annotation_id: "ann-1",
        color: "yellow",
        note: null,
        excerpt: "Hola ",
        article: { number: "1", heading: "Disposiciones generales" },
      },
      {
        id: "ca-2",
        annotation_id: "ann-2",
        color: "pink",
        note: "migrado",
        excerpt: null,
        article: null,
      },
    ]);
  });
});
