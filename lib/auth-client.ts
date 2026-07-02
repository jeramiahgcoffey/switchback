/**
 * Better Auth browser client.
 *
 * No `baseURL` is set: the auth API is mounted in this same app at
 * `/api/auth/*`, so the client defaults to same-origin requests. If auth is ever
 * split onto a separate origin, set `baseURL` here (via a `NEXT_PUBLIC_*` var).
 */
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
