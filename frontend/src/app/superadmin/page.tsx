import type { Metadata } from "next";
import { LoginForm } from "./forms";

export const metadata: Metadata = { title: "Superadmin sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function SuperadminPage() {
  return <div className="mx-auto max-w-md px-6 pt-36 pb-24"><p className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-500">COTTSON administration</p><h1 className="mb-3 text-3xl font-semibold">Superadmin sign in</h1><p className="mb-8 text-slate-500">Sign in to add products to your catalog.</p><LoginForm /></div>;
}
