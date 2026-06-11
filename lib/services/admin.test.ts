import { describe, it, expect } from "vitest";
import type { Actor } from "@/lib/authz";
import { AuthzError } from "@/lib/authz";
import { ActionError } from "@/lib/action-result";
import { makeBuilder, makeDb } from "@/lib/test/mock-supabase";
import { findArticle, setUserTier } from "./admin";

const proActor: Actor = { userId: "pro-user", tier: "pro", isAdmin: false };
const adminActor: Actor = { userId: "admin-user", tier: "pro", isAdmin: true };

describe("findArticle", () => {
  it("rejects non-admin actors", async () => {
    const db = makeDb([]);
    await expect(findArticle(db, proActor, { lawId: "law1", number: "1" })).rejects.toBeInstanceOf(
      AuthzError
    );
  });

  it("returns null when no current article matches", async () => {
    const select = makeBuilder({ data: null, error: null });
    const db = makeDb([select]);

    const result = await findArticle(db, adminActor, { lawId: "law1", number: "99" });
    expect(result).toBeNull();
  });

  it("joins paragraphs in position order", async () => {
    const select = makeBuilder({
      data: {
        id: "art1",
        paragraphs: [
          { text: "segundo", position: 2 },
          { text: "primero", position: 1 },
        ],
      },
      error: null,
    });
    const db = makeDb([select]);

    const result = await findArticle(db, adminActor, { lawId: "law1", number: "1" });
    expect(result).toEqual({ articleId: "art1", currentText: "primero\n\nsegundo" });
  });
});

describe("setUserTier", () => {
  it("rejects non-admin actors", async () => {
    const db = makeDb([]);
    await expect(
      setUserTier(db, proActor, {
        email: "user@example.com",
        tier: "pro",
        tierExpiresAt: null,
        tierSource: "manual",
      })
    ).rejects.toBeInstanceOf(AuthzError);
  });

  it("throws NOT_FOUND when no user matches the email", async () => {
    const db = makeDb([], { data: null, error: null });

    await expect(
      setUserTier(db, adminActor, {
        email: "nope@example.com",
        tier: "pro",
        tierExpiresAt: null,
        tierSource: "manual",
      })
    ).rejects.toBeInstanceOf(ActionError);
  });

  it("upserts the user_profiles row for the resolved user", async () => {
    const upsert = makeBuilder({ data: null, error: null });
    const db = makeDb([upsert], { data: "user-123", error: null });

    await setUserTier(db, adminActor, {
      email: "user@example.com",
      tier: "pro",
      tierExpiresAt: "2026-12-31",
      tierSource: "manual",
    });

    expect(upsert.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        tier: "pro",
        tier_expires_at: "2026-12-31",
        tier_source: "manual",
      }),
      { onConflict: "user_id" }
    );
  });
});
