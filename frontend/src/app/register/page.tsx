import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Join Cottson"
      title="Create your account"
      subtitle="It takes less than a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#113858] underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
