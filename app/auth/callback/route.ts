import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

/**
 * Cierre del flujo OAuth (Google) y del enlace de confirmación por correo.
 *
 * Supabase manda al usuario aquí con `?code=…`; hay que canjear ese código por
 * una sesión y dejar la cookie puesta. Sin esta ruta, "Continuar con Google" y
 * la confirmación de correo terminan en una página en blanco — era el pendiente
 * conocido de `CLAUDE.md`.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/leyes";
  const error = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(error)}`, url.origin));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=missing_code", url.origin));
  }

  const supabase = await createServerSupabaseClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(exchangeError.message)}`, url.origin)
    );
  }

  // `next` solo puede ser una ruta interna: no se acepta un destino absoluto.
  const destination = next.startsWith("/") ? next : "/leyes";
  return NextResponse.redirect(new URL(destination, url.origin));
}
