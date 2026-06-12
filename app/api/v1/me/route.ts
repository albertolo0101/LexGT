import { apiHandler } from "@/lib/api/handler";
import { requireUser } from "@/lib/authz";

export const GET = apiHandler(async ({ actor }) => {
  requireUser(actor);
  return { userId: actor.userId, tier: actor.tier, isAdmin: actor.isAdmin };
});
