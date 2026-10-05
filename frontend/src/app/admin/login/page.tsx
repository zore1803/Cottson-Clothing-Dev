import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/admin-guard";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  // Already signed in as staff: straight to the dashboard
  if (await getStaff()) redirect("/admin");
  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">COTTSON</div>
          <h1 className="mt-1 text-2xl font-bold text-brand">Admin dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Staff sign in</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
