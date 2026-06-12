import { apiHandler } from "@/lib/api/handler";
import * as annotationsService from "@/lib/services/annotations";

type Params = { id: string };

export const PATCH = apiHandler<void, Params>(async ({ db, actor, req, params }) => {
  const body = await req.json();
  const input = annotationsService.UpdateAnnotationNoteInput.parse({ id: params.id, note: body.note });
  await annotationsService.updateAnnotationNote(db, actor, input);
});

export const DELETE = apiHandler<void, Params>(async ({ db, actor, params }) => {
  const input = annotationsService.DeleteAnnotationInput.parse({ id: params.id });
  await annotationsService.deleteAnnotation(db, actor, input);
});
