import { describe, it, expect } from "vitest";
import type { Actor } from "@/lib/authz";
import { AuthzError } from "@/lib/authz";
import { ActionError } from "@/lib/action-result";
import { makeBuilder, makeDb } from "@/lib/test/mock-supabase";
import {
  saveAnnotation,
  updateAnnotationNote,
  deleteAnnotation,
  migrateAnnotations,
  markReformSeen,
  reanchorAnnotation,
} from "./annotations";

const paragraphBuilder = () => makeBuilder({ data: { text: "hola mundo" }, error: null });

const anonymousActor: Actor = { userId: null, tier: "anonymous", isAdmin: false };
const freeActor: Actor = { userId: "free-user", tier: "free", isAdmin: false };
const proActor: Actor = { userId: "pro-user", tier: "pro", isAdmin: false };

describe("saveAnnotation", () => {
  it("rejects unauthenticated users", async () => {
    const db = makeDb([]);
    await expect(
      saveAnnotation(db, anonymousActor, {
        paragraph_id: "p1",
        article_id: "a1",
        char_start: 0,
        char_end: 5,
        quote: "hola ",
      })
    ).rejects.toBeInstanceOf(AuthzError);
  });

  it("rejects non-yellow colors for free users", async () => {
    const db = makeDb([]);
    const promise = saveAnnotation(db, freeActor, {
      paragraph_id: "p1",
      article_id: "a1",
      char_start: 0,
      char_end: 5,
      quote: "hola ",
      color: "pink",
    });
    await expect(promise).rejects.toMatchObject({ code: "PRO_REQUIRED" });
  });

  it("allows yellow highlights for free users", async () => {
    const insertBuilder = makeBuilder({ data: null, error: null });
    const db = makeDb([paragraphBuilder(), insertBuilder]);

    await saveAnnotation(db, freeActor, {
      paragraph_id: "p1",
      article_id: "a1",
      char_start: 0,
      char_end: 5,
      quote: "hola ",
    });

    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "free-user", color: "yellow", quote: "hola ", anchor_status: "anchored" })
    );
  });

  it("rejects a note for free users even with color yellow", async () => {
    const db = makeDb([]);
    const promise = saveAnnotation(db, freeActor, {
      paragraph_id: "p1",
      article_id: "a1",
      char_start: 0,
      char_end: 5,
      quote: "hola ",
      color: "yellow",
      note: "text",
    });
    await expect(promise).rejects.toMatchObject({ code: "PRO_REQUIRED" });
  });

  it("allows non-yellow colors for pro users", async () => {
    const insertBuilder = makeBuilder({ data: null, error: null });
    const db = makeDb([paragraphBuilder(), insertBuilder]);

    await saveAnnotation(db, proActor, {
      paragraph_id: "p1",
      article_id: "a1",
      char_start: 0,
      char_end: 5,
      quote: "hola ",
      color: "pink",
    });

    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "pro-user", color: "pink" })
    );
  });
});

describe("updateAnnotationNote", () => {
  it("rejects free users", async () => {
    const db = makeDb([]);
    await expect(
      updateAnnotationNote(db, freeActor, { id: "ann1", note: "hola" })
    ).rejects.toMatchObject({ code: "PRO_REQUIRED" });
  });

  it("updates the note for pro users", async () => {
    const updateBuilder = makeBuilder({ data: null, error: null });
    const db = makeDb([updateBuilder]);

    await updateAnnotationNote(db, proActor, { id: "ann1", note: "hola" });

    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ note: "hola" })
    );
    expect(updateBuilder.eq).toHaveBeenCalledWith("id", "ann1");
    expect(updateBuilder.eq).toHaveBeenCalledWith("user_id", "pro-user");
  });
});

describe("deleteAnnotation", () => {
  it("rejects unauthenticated users", async () => {
    const db = makeDb([]);
    await expect(deleteAnnotation(db, anonymousActor, { id: "ann1" })).rejects.toBeInstanceOf(
      AuthzError
    );
  });

  it("deletes the annotation scoped to the owner", async () => {
    const deleteBuilder = makeBuilder({ data: null, error: null });
    const db = makeDb([deleteBuilder]);

    await deleteAnnotation(db, freeActor, { id: "ann1" });

    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(deleteBuilder.eq).toHaveBeenCalledWith("id", "ann1");
    expect(deleteBuilder.eq).toHaveBeenCalledWith("user_id", "free-user");
  });
});

describe("migrateAnnotations", () => {
  it("is a no-op for anonymous actors", async () => {
    const db = makeDb([]);
    await migrateAnnotations(db, anonymousActor, {
      oldArticleId: "old",
      newArticleId: "new",
      action: "migrate",
    });
    expect(db.from).not.toHaveBeenCalled();
  });

  it("deletes annotations for the old article when action is delete", async () => {
    const deleteBuilder = makeBuilder({ data: null, error: null });
    const db = makeDb([deleteBuilder]);

    await migrateAnnotations(db, freeActor, {
      oldArticleId: "old",
      newArticleId: "new",
      action: "delete",
    });

    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(deleteBuilder.eq).toHaveBeenCalledWith("article_id", "old");
    expect(deleteBuilder.eq).toHaveBeenCalledWith("user_id", "free-user");
  });

  it("does nothing when there are no annotations to migrate", async () => {
    const selectBuilder = makeBuilder({ data: [], error: null });
    const db = makeDb([selectBuilder]);

    await migrateAnnotations(db, freeActor, {
      oldArticleId: "old",
      newArticleId: "new",
      action: "migrate",
    });

    expect(db.from).toHaveBeenCalledTimes(1);
  });

  it("throws NOT_FOUND when the new article has no paragraphs", async () => {
    const selectBuilder = makeBuilder({
      data: [{ paragraph_id: "p1", char_start: 0, char_end: 5, color: "yellow", note: null, paragraphs: { text: "hola mundo" } }],
      error: null,
    });
    const paragraphsBuilder = makeBuilder({ data: [], error: null });
    const db = makeDb([selectBuilder, paragraphsBuilder]);

    await expect(
      migrateAnnotations(db, freeActor, {
        oldArticleId: "old",
        newArticleId: "new",
        action: "migrate",
      })
    ).rejects.toBeInstanceOf(ActionError);
  });

  it("re-creates annotations as quoted notes on the first paragraph of the new article", async () => {
    const selectBuilder = makeBuilder({
      data: [
        {
          paragraph_id: "p1",
          char_start: 0,
          char_end: 4,
          color: "yellow",
          note: "mi nota",
          paragraphs: { text: "hola mundo" },
        },
      ],
      error: null,
    });
    const paragraphsBuilder = makeBuilder({ data: [{ id: "new-p1" }], error: null });
    const insertBuilder = makeBuilder({ data: null, error: null });
    const deleteBuilder = makeBuilder({ data: null, error: null });
    const db = makeDb([selectBuilder, paragraphsBuilder, insertBuilder, deleteBuilder]);

    await migrateAnnotations(db, freeActor, {
      oldArticleId: "old",
      newArticleId: "new",
      action: "migrate",
    });

    expect(insertBuilder.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: "free-user",
        paragraph_id: "new-p1",
        article_id: "new",
        color: "yellow",
        note: '> "hola"\nmi nota',
      }),
    ]);
    expect(deleteBuilder.delete).toHaveBeenCalled();
  });
});

describe("markReformSeen", () => {
  it("is a no-op for anonymous actors", async () => {
    const db = makeDb([]);
    await markReformSeen(db, anonymousActor, { reformId: "reform1" });
    expect(db.from).not.toHaveBeenCalled();
  });

  it("inserts a notification row for authenticated users", async () => {
    const insertBuilder = makeBuilder({ data: null, error: null });
    const db = makeDb([insertBuilder]);

    await markReformSeen(db, freeActor, { reformId: "reform1" });

    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "free-user", reform_id: "reform1" })
    );
  });
});

describe("reanchorAnnotation", () => {
  it("is a no-op for anonymous actors", async () => {
    const db = makeDb([]);
    await reanchorAnnotation(db, anonymousActor, {
      id: "ann1",
      char_start: 4,
      char_end: 12,
      text_checksum: "abc123",
      anchor_status: "reanchored",
    });
    expect(db.from).not.toHaveBeenCalled();
  });

  it("updates offsets/checksum/status scoped to the owner", async () => {
    const updateBuilder = makeBuilder({ data: null, error: null });
    const db = makeDb([updateBuilder]);

    await reanchorAnnotation(db, freeActor, {
      id: "ann1",
      char_start: 4,
      char_end: 12,
      text_checksum: "abc123",
      anchor_status: "reanchored",
    });

    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        char_start: 4,
        char_end: 12,
        text_checksum: "abc123",
        anchor_status: "reanchored",
      })
    );
    expect(updateBuilder.eq).toHaveBeenCalledWith("id", "ann1");
    expect(updateBuilder.eq).toHaveBeenCalledWith("user_id", "free-user");
  });
});
