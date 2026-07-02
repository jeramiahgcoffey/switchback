import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell, safeRedirect } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a Switchback account to save your rig and trips.",
};

const githubEnabled = Boolean(
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET,
);

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  return (
    <AuthShell
      title="Create your account"
      subtitle="Save your rig build and trip plans, and pick them up on any device."
    >
      <AuthForm
        mode="sign-up"
        githubEnabled={githubEnabled}
        redirectTo={safeRedirect(redirect)}
      />
    </AuthShell>
  );
}
