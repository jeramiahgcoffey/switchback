/**
 * Better Auth server instance.
 *
 * Backed by MongoDB via the schemaless `mongodbAdapter` (Better Auth creates its
 * own `user` / `session` / `account` / `verification` collections on the fly, no
 * migration step). Email + password is enabled with a low-friction posture for a
 * portfolio app: email verification is left off and auto sign-in on signup stays
 * on (both are Better Auth defaults, called out here for intent).
 *
 * `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are read from the environment
 * automatically by `betterAuth()`.
 *
 * GitHub OAuth is wired but optional: the provider is only registered when both
 * `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are present, so the sign-in UI
 * can hide the GitHub button until those are provisioned.
 */
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import client from "./mongodb";

// `MONGODB_DB` overrides the target database; default to a stable, predictable
// name rather than whatever (if anything) the connection string encodes.
const db = client.db(process.env.MONGODB_DB || "switchback");

const githubEnabled = Boolean(
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET,
);

// Production (custom domain) is auto-trusted via BETTER_AUTH_URL. For Vercel
// preview deploys, trust only THIS deployment's own hostnames, taken from
// Vercel's injected system env vars (set only for this project's deployments) --
// never a wildcard on the shared *.vercel.app suffix, which anyone could match
// by naming a project "switchback-...". Empty locally (localhost is the baseURL).
const trustedOrigins = [
  process.env.VERCEL_URL,
  process.env.VERCEL_BRANCH_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
]
  .filter(Boolean)
  .map((host) => `https://${host}`);

export const auth = betterAuth({
  database: mongodbAdapter(db, { client }),
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    // requireEmailVerification omitted (false) -> instant signup, no SMTP.
    // autoSignIn defaults true -> user lands authenticated after registering.
  },
  ...(githubEnabled
    ? {
        socialProviders: {
          github: {
            clientId: process.env.GITHUB_CLIENT_ID as string,
            clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
          },
        },
      }
    : {}),
  // nextCookies MUST stay last: it forwards Set-Cookie from Server Actions.
  plugins: [nextCookies()],
});
