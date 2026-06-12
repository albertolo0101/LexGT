import { apiHandler } from "@/lib/api/handler";
import * as casesService from "@/lib/services/cases";
import { getCaseDetail, type CaseDetail } from "@/lib/services/queries/cases";

type Params = { id: string };

export const GET = apiHandler<CaseDetail, Params>(async ({ db, actor, params }) => {
  return getCaseDetail(db, actor, params.id);
});

export const DELETE = apiHandler<void, Params>(async ({ db, actor, params }) => {
  const input = casesService.DeleteCaseInput.parse({ caseId: params.id });
  await casesService.deleteCase(db, actor, input);
});
