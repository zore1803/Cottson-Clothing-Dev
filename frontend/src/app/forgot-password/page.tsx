import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Forgot your password?"
      subtitle="Enter your email and we will send you a link to choose a new one."
      footer={
        <Link href="/login" className="font-semibold text-[#113858] underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
