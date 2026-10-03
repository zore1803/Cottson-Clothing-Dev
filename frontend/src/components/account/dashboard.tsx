"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Check, LayoutDashboard, LogOut, MapPin, Package, Palette, ShieldCheck, User, Wallet, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { send } from "@/components/auth/fields";
import { formatPrice } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { AddressesSection } from "./addresses-section";
import { EmptyOrders, OrderCard, OrdersSection } from "./orders-section";
import { DesignsSection } from "./designs-section";
import { ProfileSection } from "./profile-section";
import { Avatar, Card, btnGhost, btnPrimary, fullName, imageToAvatar, notifyAccountChanged, type AccountCustomer, type Order, type SavedDesign } from "./shared";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "profile", label: "Profile", icon: User },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "orders", label: "Orders", icon: Package },
  { id: "designs", label: "My designs", icon: Palette },
  { id: "security", label: "Security", icon: ShieldCheck },
] as const;
type Tab = (typeof TABS)[number]["id"];

export function Dashboard({ customer, orders, designs, initialTab }: { customer: AccountCustomer; orders: Order[]; designs: SavedDesign[]; initialTab?: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTabState] = useState<Tab>(TABS.some((t) => t.id === initialTab) ? (initialTab as Tab) : "overview");
  const [photoBusy, setPhotoBusy] = useState(false);

  const name = fullName(customer);
  const spent = orders.filter((o) => o.status !== "canceled").reduce((sum, o) => sum + o.total, 0);
  const since = new Date(customer.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

  const setTab = (t: Tab) => {
    setTabState(t);
    window.history.replaceState(null, "", t === "overview" ? "/account" : `/account?tab=${t}`);
  };

  async function savePhoto(avatar: string) {
    setPhotoBusy(true);
    try {
      await send("/api/auth/me", { avatar }, "PATCH");
      toast.success(avatar ? "Profile photo updated" : "Profile photo removed");
      notifyAccountChanged();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
    setPhotoBusy(false);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await savePhoto(await imageToAvatar(file));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that image");
    }
  }

  async function signOut() {
    await send("/api/auth/logout", {});
    router.replace("/");
    router.refresh();
  }

  async function sendResetLink() {
    try {
      await send("/api/auth/forgot-password", { email: customer.email });
      toast.success("Reset link sent. Check your inbox.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const defaultAddress = customer.addresses.find((a) => a.is_default_shipping) ?? customer.addresses[0];
  const checklist = [
    { label: "Add a profile photo", done: !!customer.avatar, tab: "profile" as Tab },
    { label: "Add your phone number", done: !!customer.phone, tab: "profile" as Tab },
    { label: "Add your company name", done: !!customer.company_name, tab: "profile" as Tab },
    { label: "Add your GST number", done: !!customer.gst, tab: "profile" as Tab },
    { label: "Save a delivery address", done: customer.addresses.length > 0, tab: "addresses" as Tab },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const pct = Math.round((doneCount / checklist.length) * 100);

  const stats = [
    { label: "Orders", value: String(orders.length), icon: Package },
    { label: "Total spent", value: formatPrice(spent), icon: Wallet },
    { label: "Saved addresses", value: String(customer.addresses.length), icon: MapPin },
    { label: "Member since", value: since, icon: CalendarDays },
  ];

  return (
    <div className="min-h-screen bg-[#EAF1F7] pb-20">
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0B2A45] via-[#113858] to-[#1F5A8C] px-4 pb-24 pt-32 sm:px-8 sm:pt-36">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/[0.05]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 left-1/3 size-[420px] rounded-full bg-[#3B82B6]/20 blur-2xl" />
        <div className="relative mx-auto flex max-w-[1120px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            <div className="relative shrink-0">
              <Avatar src={customer.avatar} label={customer.first_name || customer.email} className="size-20 text-3xl ring-4 ring-white/25 sm:size-24 sm:text-4xl" />
              <button
                type="button"
                aria-label="Change profile photo"
                onClick={() => fileRef.current?.click()}
                disabled={photoBusy}
                className="absolute -bottom-1 -right-1 grid size-9 place-items-center rounded-full bg-white text-[#113858] shadow-lg transition hover:scale-105 hover:bg-[#EAF1F7] disabled:opacity-60"
              >
                <Camera size={16} />
              </button>
            </div>
            <div className="min-w-0 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8DB8DC]">My account</p>
              <h1 className="mt-1 break-words text-[24px] leading-tight font-semibold tracking-[-0.03em] sm:text-[36px]">{name || "Welcome"}</h1>
              <p className="break-words text-[14px] text-white/70">
                {customer.email}
                {customer.company_name && <span> · {customer.company_name}</span>}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/products" className="inline-flex h-11 items-center rounded-full bg-white px-6 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#113858] transition hover:-translate-y-0.5 hover:bg-[#EAF1F7]">
              Shop
            </Link>
            <button type="button" onClick={signOut} className="inline-flex h-11 items-center gap-2 rounded-full border border-white/30 px-6 text-[12px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-white/10">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto -mt-14 max-w-[1120px] px-4 sm:px-8">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-3.5 rounded-2xl border border-[#113858]/[0.08] bg-white p-4 shadow-[0_8px_30px_rgba(17,56,88,0.08)] sm:p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#DCEAF5] text-[#1F5A8C]">
                <s.icon size={20} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[18px] font-semibold tracking-[-0.02em] text-[#0B2A45] sm:text-[20px]">{s.value}</p>
                <p className="truncate text-[12px] font-medium text-[#5B7690]">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[230px_1fr]">
          {/* Navigation */}
          <nav aria-label="Account sections" className="flex gap-1.5 overflow-x-auto rounded-2xl border border-[#113858]/[0.08] bg-white p-2 shadow-[0_8px_30px_rgba(17,56,88,0.06)] lg:h-fit lg:flex-col lg:overflow-visible">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                className={cn(
                  "flex h-11 shrink-0 items-center gap-3 rounded-xl px-4 text-[14px] font-semibold transition",
                  tab === t.id ? "bg-[#113858] text-white" : "text-[#35516B] hover:bg-[#EAF1F7]"
                )}
              >
                <t.icon size={17} />
                {t.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="min-w-0 space-y-6">
            {tab === "overview" && (
              <>
                <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
                  <Card title={`Welcome back${customer.first_name ? `, ${customer.first_name}` : ""}`} subtitle="Here is a snapshot of your account.">
                    <div className="flex flex-wrap gap-3">
                      <Link href="/products" className={btnPrimary}>Browse products</Link>
                      <Link href="/contact" className={btnGhost}>Request a bulk quote</Link>
                    </div>
                  </Card>
                  <Card title="Profile strength" subtitle={`${doneCount} of ${checklist.length} complete`}>
                    <div className="h-2 overflow-hidden rounded-full bg-[#DCEAF5]">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#3B82B6] to-[#113858] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <ul className="mt-4 space-y-2">
                      {checklist.map((c) => (
                        <li key={c.label}>
                          <button type="button" disabled={c.done} onClick={() => setTab(c.tab)} className="flex w-full items-center gap-2.5 text-left text-[13px] disabled:cursor-default">
                            <span className={cn("grid size-5 shrink-0 place-items-center rounded-full", c.done ? "bg-[#113858] text-white" : "border border-[#113858]/25")}>
                              {c.done && <Check size={12} strokeWidth={3} />}
                            </span>
                            <span className={c.done ? "text-[#5B7690] line-through" : "font-medium text-[#113858] hover:underline"}>{c.label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>

                <Card
                  title="Recent orders"
                  action={orders.length > 3 ? <button type="button" onClick={() => setTab("orders")} className="text-[13px] font-semibold text-[#1F5A8C] hover:underline">View all</button> : undefined}
                >
                  {orders.length ? <div className="space-y-4">{orders.slice(0, 3).map((o) => <OrderCard key={o.id} order={o} />)}</div> : <EmptyOrders />}
                </Card>

                <Card title="Default delivery address" action={<button type="button" onClick={() => setTab("addresses")} className="text-[13px] font-semibold text-[#1F5A8C] hover:underline">{defaultAddress ? "Manage" : "Add"}</button>}>
                  {defaultAddress ? (
                    <div className="text-[14px] leading-relaxed text-[#35516B]">
                      <p className="font-semibold text-[#0B2A45]">{[defaultAddress.first_name, defaultAddress.last_name !== "-" && defaultAddress.last_name].filter(Boolean).join(" ")}</p>
                      <p>{[defaultAddress.address_1, defaultAddress.address_2].filter(Boolean).join(", ")}</p>
                      <p>{[defaultAddress.city, defaultAddress.province, defaultAddress.postal_code].filter(Boolean).join(", ")}</p>
                    </div>
                  ) : (
                    <p className="text-[14px] text-[#5B7690]">No address saved yet. Add one to speed up checkout.</p>
                  )}
                </Card>
              </>
            )}

            {tab === "profile" && (
              <ProfileSection customer={customer} photoBusy={photoBusy} onPickPhoto={() => fileRef.current?.click()} onRemovePhoto={() => savePhoto("")} />
            )}
            {tab === "addresses" && <AddressesSection addresses={customer.addresses} />}
            {tab === "orders" && <OrdersSection orders={orders} />}
            {tab === "designs" && <DesignsSection designs={designs} />}
            {tab === "security" && (
              <Card title="Password" subtitle="Keep your account secure.">
                <p className="text-[14.5px] leading-relaxed text-[#35516B]">
                  To change your password, we will email a secure, single-use link to <strong className="text-[#0B2A45]">{customer.email}</strong>.
                </p>
                <button type="button" onClick={sendResetLink} className={`${btnPrimary} mt-5`}>
                  Email me a reset link
                </button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
