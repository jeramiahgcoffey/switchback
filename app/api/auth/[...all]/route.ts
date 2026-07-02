/**
 * Better Auth catch-all route handler.
 *
 * Mounts every Better Auth endpoint (sign-in, sign-up, sign-out, session,
 * OAuth callbacks, ...) under `/api/auth/*`. Route Handlers are not cached by
 * default, which is what auth requires.
 */
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
