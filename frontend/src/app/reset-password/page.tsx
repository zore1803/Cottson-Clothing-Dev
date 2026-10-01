import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <AuthShell eyebrow="Account recovery" title="Choose a new password" subtitle="Pick something at least 8 characters long.">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
