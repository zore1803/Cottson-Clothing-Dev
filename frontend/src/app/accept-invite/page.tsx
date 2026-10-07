import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { AcceptInviteForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Accept invite", robots: { index: false, follow: false } };

export default function AcceptInvitePage() {
  return (
    <AuthShell eyebrow="Team invite" title="Join the COTTSON admin" subtitle="Choose a password to finish setting up your staff account.">
      <Suspense fallback={null}>
        <AcceptInviteForm />
      </Suspense>
    </AuthShell>
  );
}
