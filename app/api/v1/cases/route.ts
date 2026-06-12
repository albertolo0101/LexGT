import { apiHandler } from "@/lib/api/handler";
import * as casesService from "@/lib/services/cases";
import { listCases } from "@/lib/services/queries/cases";

export const GET = apiHandler(async ({ db, actor }) => {
  return listCases(db, actor);
});

export const POST = apiHandler(async ({ db, actor, req }) => {
  const body = await req.json();
  const input = casesService.CreateCaseInput.parse(body);
  return casesService.createCase(db, actor, input);
});
