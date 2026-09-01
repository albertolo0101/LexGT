import { apiHandler } from "@/lib/api/handler";
import * as annotationsService from "@/lib/services/annotations";

export const POST = apiHandler(async ({ db, actor, req }) => {
  const body = await req.json();
  const input = annotationsService.SaveAnnotationInput.parse(body);
  return annotationsService.saveAnnotation(db, actor, input);
});
