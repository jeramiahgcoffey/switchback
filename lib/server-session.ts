import "server-only";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/** Minimal authenticated identity for server-side authorization checks. */
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}
