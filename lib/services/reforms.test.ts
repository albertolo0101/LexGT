import { describe, it, expect } from "vitest";
import type { Actor } from "@/lib/authz";
import { AuthzError } from "@/lib/authz";
import { ActionError } from "@/lib/action-result";
import { makeBuilder, makeDb } from "@/lib/test/mock-supabase";
import { publishReform, createReformDraft, approveReform } from "./reforms";

const proActor: Actor = { userId: "pro-user", tier: "pro", isAdmin: false };
const adminActor: Actor = { userId: "admin-user", tier: "pro", isAdmin: true };

const oldArticle = {
  id: "old-art",
  law_id: "law1",
  section_id: "sec1",
  number: "1",
  heading: "Artículo 1",
  position: 1,
  version: 1,
  version_number: 1,
};

describe("publishReform", () => {
  it("rejects non-admin actors", async () => {
    const db = makeDb([]);
    await expect(
      publishReform(db, proActor, {
        lawId: "law1",
        title: "Reforma",
        publishedAt: "2026-01-01",
        affectedArticleIds: [],
        newParagraphsByArticle: {},
      })
    ).rejects.toBeInstanceOf(AuthzError);
  });

  it("creates a new article version with new paragraphs and supersedes the old one", async () => {
    const reformInsert = makeBuilder({ data: { id: "reform1" }, error: null });
    const articleSelect = makeBuilder({ data: oldArticle, error: null });
    const articleInsert = makeBuilder({ data: { id: "new-art" }, error: null });
    const paragraphInsert = makeBuilder({ data: null, error: null });
    const articleUpdate = makeBuilder({ data: null, error: null });
    const db = makeDb([reformInsert, articleSelect, articleInsert, paragraphInsert, articleUpdate]);

    await publishReform(db, adminActor, {
      lawId: "law1",
      title: "Reforma",
      publishedAt: "2026-01-01",
      affectedArticleIds: ["old-art"],
      newParagraphsByArticle: { "old-art": [{ text: "Nuevo texto", position: 1 }] },
    });

    expect(reformInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({ law_id: "law1", title: "Reforma" })
    );
    expect(articleInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        previous_version_id: "old-art",
        reform_id: "reform1",
        version: 2,
        version_number: 2,
        is_current: true,
      })
    );
    expect(paragraphInsert.insert).toHaveBeenCalledWith([
      expect.objectContaining({ text: "Nuevo texto", article_id: "new-art" }),
    ]);
    expect(articleUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_current: false })
    );
    expect(articleUpdate.eq).toHaveBeenCalledWith("id", "old-art");
  });
});

describe("createReformDraft", () => {
  it("rejects non-admin actors", async () => {
    const db = makeDb([]);
    await expect(
      createReformDraft(db, proActor, {
        lawId: "law1",
        title: "Reforma",
        description: "",
        articles: [],
      })
    ).rejects.toBeInstanceOf(AuthzError);
  });

  it("creates a draft reform with draft articles", async () => {
    const reformInsert = makeBuilder({ data: { id: "reform1" }, error: null });
    const draftInsert = makeBuilder({ data: null, error: null });
    const db = makeDb([reformInsert, draftInsert]);

    const result = await createReformDraft(db, adminActor, {
      lawId: "law1",
      title: "Reforma",
      description: "desc",
      articles: [{ articleId: "old-art", newText: "Nuevo texto" }],
    });

    expect(reformInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({ law_id: "law1", status: "draft" })
    );
    expect(draftInsert.insert).toHaveBeenCalledWith([
      expect.objectContaining({ reform_id: "reform1", article_id: "old-art", new_text: "Nuevo texto" }),
    ]);
    expect(result).toEqual({ id: "reform1" });
  });
});

describe("approveReform", () => {
  it("rejects non-admin actors", async () => {
    const db = makeDb([]);
    await expect(approveReform(db, proActor, { reformId: "reform1" })).rejects.toBeInstanceOf(
      AuthzError
    );
  });

  it("rejects reforms that are already published", async () => {
    const reformSelect = makeBuilder({
      data: { id: "reform1", status: "published", reform_draft_articles: [] },
      error: null,
    });
    const db = makeDb([reformSelect]);

    await expect(approveReform(db, adminActor, { reformId: "reform1" })).rejects.toBeInstanceOf(
      ActionError
    );
  });

  it("supersedes each draft article and marks the reform as published", async () => {
    const reformSelect = makeBuilder({
      data: {
        id: "reform1",
        status: "draft",
        reform_draft_articles: [{ article_id: "old-art", new_text: "Párrafo nuevo" }],
      },
      error: null,
    });
    const articleSelect = makeBuilder({ data: oldArticle, error: null });
    const articleInsert = makeBuilder({ data: { id: "new-art" }, error: null });
    const paragraphInsert = makeBuilder({ data: null, error: null });
    const articleUpdate = makeBuilder({ data: null, error: null });
    const reformUpdate = makeBuilder({ data: null, error: null });
    const db = makeDb([
      reformSelect,
      articleSelect,
      articleInsert,
      paragraphInsert,
      articleUpdate,
      reformUpdate,
    ]);

    await approveReform(db, adminActor, { reformId: "reform1" });

    expect(articleInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({ previous_version_id: "old-art", reform_id: "reform1" })
    );
    expect(paragraphInsert.insert).toHaveBeenCalledWith([
      expect.objectContaining({ text: "Párrafo nuevo", article_id: "new-art" }),
    ]);
    expect(reformUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "published" })
    );
    expect(reformUpdate.eq).toHaveBeenCalledWith("id", "reform1");
  });
});
