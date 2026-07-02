import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell, safeRedirect } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Switchback account.",
};

const githubEnabled = Boolean(
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET,
);

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to sync your rig build and trip plans across devices."
    >
      <AuthForm
        mode="sign-in"
        githubEnabled={githubEnabled}
        redirectTo={safeRedirect(redirect)}
      />
    </AuthShell>
  );
}
