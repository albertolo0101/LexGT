import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Tercer factory de cliente Supabase, solo para app/api/v1/*: construye un
// cliente a partir del `Authorization: Bearer <access_token>` de la request.
// RLS aplica igual que en web (mismo JWT). No usar en Server Components ni
// Server Actions — para esos, ver lib/supabase-server.ts y lib/supabase.ts.
export function createBearerClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
