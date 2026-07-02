"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up";

const inputClass =
  "mt-2 w-full rounded border border-edge-strong bg-basalt px-3 py-2.5 text-sm text-bone outline-none transition-colors duration-150 placeholder:text-sand-dim focus:border-ember";

/**
 * Email + password auth form, shared by /sign-in and /sign-up. GitHub is only
 * offered when the server reports the provider is configured. On success the
 * browser is sent to `redirectTo` (already validated server-side as an internal
 * path). Better Auth auto-signs-in after signup, so both modes land signed in.
 */
export function AuthForm({
  mode,
  githubEnabled,
  redirectTo,
}: {
  mode: Mode;
  githubEnabled: boolean;
  redirectTo: string;
}) {
  const router = useRouter();
  const isSignUp = mode === "sign-up";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [githubPending, setGithubPending] = useState(false);

  async function submit() {
    setError(null);
    setPending(true);
    const res = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password });
    if (res.error) {
      setPending(false);
      setError(res.error.message ?? "Something went wrong. Try again.");
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  async function onGithub() {
    setError(null);
    setGithubPending(true);
    const res = await authClient.signIn.social({
      provider: "github",
      callbackURL: redirectTo,
    });
    // On success the browser redirects to GitHub; we only land here on error.
    if (res.error) {
      setGithubPending(false);
      setError(res.error.message ?? "GitHub sign-in failed.");
    }
  }

  return (
    <div className="card-surface p-6 sm:p-7">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        {isSignUp && (
          <div>
            <label htmlFor="auth-name" className="stat-label block">
              Name
            </label>
            <input
              id="auth-name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="What we call you on the trail"
            />
          </div>
        )}

        <div>
          <label htmlFor="auth-email" className="stat-label block">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="auth-password" className="stat-label block">
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder={isSignUp ? "At least 8 characters" : "Your password"}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded border border-rust/40 bg-rust/10 px-3 py-2 text-xs leading-relaxed text-rust-bright"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="md"
          disabled={pending}
          className="mt-1 w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending
            ? isSignUp
              ? "Creating account"
              : "Signing in"
            : isSignUp
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>

      {githubEnabled && (
        <>
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-edge" />
            <span className="stat-label">or</span>
            <span className="h-px flex-1 bg-edge" />
          </div>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onGithub}
            disabled={githubPending}
            className="w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GithubIcon />
            {githubPending ? "Redirecting" : "Continue with GitHub"}
          </Button>
        </>
      )}

      <p className="mt-6 text-center text-xs text-sand-dim">
        {isSignUp ? (
          <>
            Already have an account?{" "}
            <Link href="/sign-in" className="text-ember-bright hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/sign-up" className="text-ember-bright hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
