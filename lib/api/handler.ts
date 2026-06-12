import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createBearerClient } from "@/lib/supabase-bearer";
import { getActor, AuthzError, type Actor } from "@/lib/authz";
import { ActionError, FALLBACK_MESSAGES, type ActionErrorCode } from "@/lib/action-result";
import { apiLimiter, checkRateLimit } from "@/lib/api/rate-limit";

const STATUS_BY_CODE: Record<ActionErrorCode, number> = {
  UNAUTHENTICATED: 401,
  PRO_REQUIRED: 403,
  ADMIN_REQUIRED: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

function jsonError(code: ActionErrorCode, message?: string) {
  return NextResponse.json(
    { ok: false, code, message: message ?? FALLBACK_MESSAGES[code] },
    { status: STATUS_BY_CODE[code] }
  );
}

export type ApiContext<Params = Record<string, string>> = {
  db: SupabaseClient;
  actor: Actor;
  req: NextRequest;
  params: Params;
};

// Wrapper compartido para app/api/v1/*: extrae el bearer token, construye el
// cliente y el Actor, llama al handler y mapea errores a {ok,code,message} +
// status HTTP. El handler solo debe llamar a un servicio de lib/services.
export function apiHandler<T, Params = Record<string, string>>(
  fn: (ctx: ApiContext<Params>) => Promise<T>
) {
  return async (req: NextRequest, routeCtx?: { params: Promise<Params> }): Promise<NextResponse> => {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return jsonError("UNAUTHENTICATED", "Falta el header Authorization: Bearer <token>.");

    const db = createBearerClient(token);

    try {
      const actor = await getActor(db);

      const allowed = await checkRateLimit(apiLimiter, actor.userId ?? "anonymous");
      if (!allowed) return jsonError("RATE_LIMITED");

      const params = routeCtx ? await routeCtx.params : ({} as Params);
      const data = await fn({ db, actor, req, params });
      return NextResponse.json({ ok: true, data });
    } catch (e) {
      if (e instanceof AuthzError) return jsonError(e.code, FALLBACK_MESSAGES[e.code]);
      if (e instanceof ActionError) return jsonError(e.code, e.message);
      if (e instanceof ZodError) return jsonError("VALIDATION", "Datos inválidos.");
      console.error(e);
      return jsonError("INTERNAL");
    }
  };
}
