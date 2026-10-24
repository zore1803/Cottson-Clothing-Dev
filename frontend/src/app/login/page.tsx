import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  // Keep the "come back to" page when switching to registration
  const qs = next?.startsWith("/") && !next.startsWith("//") ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your account"
      subtitle="Access your orders, saved designs and details."
      footer={
        <>
          New to Cottson?{" "}
          <Link href={`/register${qs}`} className="font-semibold text-[#113858] underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
