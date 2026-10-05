"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Boxes, ClipboardList, Factory, LayoutDashboard, LogOut, Menu, Receipt, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV: { heading?: string; items: { href: string; label: string; icon: typeof Boxes; badge?: "toApprove" | "newQuotes" }[] }[] = [
  { items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }] },
  {
    heading: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", icon: Receipt },
      { href: "/admin/quotes", label: "Quotes", icon: ClipboardList, badge: "newQuotes" },
    ],
  },
  {
    heading: "Catalogue",
    items: [
      { href: "/admin/products", label: "Products & stock", icon: Boxes },
      { href: "/admin/production", label: "Production", icon: Factory, badge: "toApprove" },
    ],
  },
  { heading: "System", items: [{ href: "/admin/settings", label: "Settings", icon: Settings }] },
];

type Summary = { toApprove: number; newQuotes: number };

export function AdminShell({ admin, children }: { admin: { email: string; name: string }; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);

  // Counts next to Quotes and Production; refreshed whenever you move between screens
  useEffect(() => {
    let live = true;
    fetch("/api/admin/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && d && setSummary(d))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [pathname]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
        <Link href="/admin" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <img src="/cottson.png" alt="COTTSON" className="h-7 w-auto" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Admin</span>
        </Link>
        <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden">
          <X size={16} />
        </button>
      </div>

      <nav aria-label="Admin" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV.map((group, i) => (
          <div key={group.heading ?? i}>
            {group.heading && <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">{group.heading}</p>}
            <ul className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, badge }) => {
                const active = isActive(href);
                const count = badge && summary ? summary[badge] : 0;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn("flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium transition", active ? "bg-[#113858]/[0.07] text-[#113858]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")}
                    >
                      <Icon size={15} strokeWidth={active ? 2.2 : 1.8} className={active ? "text-[#113858]" : "text-slate-400"} />
                      <span className="flex-1 truncate">{label}</span>
                      {count > 0 && <span className="rounded bg-slate-200/70 px-1.5 text-[11px] font-semibold tabular-nums text-slate-700">{count}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="px-2 pb-2">
          <p className="truncate text-[13px] font-medium text-slate-900">{admin.name || admin.email}</p>
          {admin.name && <p className="truncate text-[12px] text-slate-500">{admin.email}</p>}
        </div>
        <button type="button" onClick={signOut} className="flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
          <LogOut size={15} className="text-slate-400" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-slate-200 bg-white lg:block">{sidebar}</aside>

      <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <img src="/cottson.png" alt="COTTSON" className="h-5 w-auto" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Admin</span>
        </Link>
        <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100">
          <Menu size={18} />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setOpen(false)} aria-hidden />
          <aside className="relative h-full w-[260px] bg-white shadow-xl">{sidebar}</aside>
        </div>
      )}

      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </main>
    </div>
  );
}
