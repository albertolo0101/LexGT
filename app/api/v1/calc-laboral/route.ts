import { apiHandler } from "@/lib/api/handler";
import { IndemnizacionInput } from "@/lib/modules/calc-laboral/schemas";
import { calculateIndemnizacion } from "@/lib/modules/calc-laboral/service";

export const POST = apiHandler(async ({ actor, req }) => {
  const body = await req.json();
  const input = IndemnizacionInput.parse(body);
  return calculateIndemnizacion(actor, input);
});
