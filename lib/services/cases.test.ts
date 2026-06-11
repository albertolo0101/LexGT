import { describe, it, expect } from "vitest";
import type { Actor } from "@/lib/authz";
import { AuthzError } from "@/lib/authz";
import { makeBuilder, makeDb } from "@/lib/test/mock-supabase";
import {
  createCase,
  deleteCase,
  addAnnotationToCase,
  removeAnnotationFromCase,
} from "./cases";

const freeActor: Actor = { userId: "free-user", tier: "free", isAdmin: false };
const proActor: Actor = { userId: "pro-user", tier: "pro", isAdmin: false };

describe("createCase", () => {
  it("rejects free users", async () => {
    const db = makeDb([]);
    await expect(
      createCase(db, freeActor, { title: "Mi caso" })
    ).rejects.toMatchObject({ code: "PRO_REQUIRED" });
  });

  it("creates a case for pro users", async () => {
    const insertBuilder = makeBuilder({ data: { id: "case1", title: "Mi caso" }, error: null });
    const db = makeDb([insertBuilder]);

    const result = await createCase(db, proActor, { title: "Mi caso" });

    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "pro-user", title: "Mi caso", color: "gray" })
    );
    expect(result).toEqual({ id: "case1", title: "Mi caso" });
  });
});

describe("deleteCase", () => {
  it("rejects unauthenticated/free users", async () => {
    const db = makeDb([]);
    await expect(deleteCase(db, freeActor, { caseId: "case1" })).rejects.toBeInstanceOf(
      AuthzError
    );
  });

  it("deletes the case scoped to the owner", async () => {
    const deleteBuilder = makeBuilder({ data: null, error: null });
    const db = makeDb([deleteBuilder]);

    await deleteCase(db, proActor, { caseId: "case1" });

    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(deleteBuilder.eq).toHaveBeenCalledWith("id", "case1");
    expect(deleteBuilder.eq).toHaveBeenCalledWith("user_id", "pro-user");
  });
});

describe("addAnnotationToCase", () => {
  it("ignores duplicate-key errors", async () => {
    const insertBuilder = makeBuilder({
      data: null,
      error: { message: "duplicate key value violates unique constraint" },
    });
    const db = makeDb([insertBuilder]);

    await expect(
      addAnnotationToCase(db, proActor, { caseId: "case1", annotationId: "ann1" })
    ).resolves.toBeUndefined();
  });

  it("throws on other errors", async () => {
    const insertBuilder = makeBuilder({ data: null, error: { message: "boom" } });
    const db = makeDb([insertBuilder]);

    await expect(
      addAnnotationToCase(db, proActor, { caseId: "case1", annotationId: "ann1" })
    ).rejects.toMatchObject({ message: "boom" });
  });
});

describe("removeAnnotationFromCase", () => {
  it("deletes the case_annotations row", async () => {
    const deleteBuilder = makeBuilder({ data: null, error: null });
    const db = makeDb([deleteBuilder]);

    await removeAnnotationFromCase(db, proActor, { caseAnnotationId: "ca1" });

    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(deleteBuilder.eq).toHaveBeenCalledWith("id", "ca1");
  });
});
