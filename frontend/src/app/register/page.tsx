import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  // Keep the "come back to" page when switching to sign-in
  const qs = next?.startsWith("/") && !next.startsWith("//") ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <AuthShell
      eyebrow="Join Cottson"
      title="Create your account"
      subtitle="It takes less than a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link href={`/login${qs}`} className="font-semibold text-[#113858] underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
