"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { BookOpen, ShoppingCart, UserRound } from "lucide-react";
import { useCart, cartCount } from "@/lib/cart-store";
import { MegaMenu } from "@/components/mega-menu";


// The cart lives in localStorage, so only show its count after hydration
const useMounted = () => useSyncExternalStore(() => () => {}, () => true, () => false);

export function SiteHeader() {
  const items = useCart((s) => s.items);
  const mounted = useMounted();
  const count = mounted ? cartCount(items) : 0;

  return (
    <header className="sticky top-0 z-40 border-b-2 border-brand-accent bg-background">
      <div className="relative mx-auto flex h-24 max-w-7xl items-center gap-5 px-4">
        <Link href="/" className="text-2xl font-bold tracking-tight text-brand">
          cottson<span className="text-brand-accent">.</span>
        </Link>
        <MegaMenu />

        <div className="ml-auto flex items-center gap-1.5 sm:gap-5">
          {[
            { href: "/products", label: "Catalog", Icon: BookOpen },
            { href: "/cart", label: "Basket", Icon: ShoppingCart, badge: count },
            { href: "#", label: "Login", Icon: UserRound },
          ].map(({ href, label, Icon, badge }) => (
            <Link
              key={label}
              href={href}
              className="relative hidden flex-col items-center gap-1 rounded-lg px-3.5 py-2 text-xs leading-none transition-colors hover:bg-muted sm:flex"
            >
              <Icon className="size-5 text-brand" strokeWidth={1.6} />
              {label}
              {!!badge && (
                <span className="absolute -top-1.5 right-0 grid size-4 place-items-center rounded-full bg-brand-accent text-[9px] font-semibold text-white">
                  {badge}
                </span>
              )}
            </Link>
          ))}
          <Link href="/cart" className="relative p-2 sm:hidden" aria-label={`Basket, ${count} items`}>
            <ShoppingCart className="size-5 text-brand" />
            {count > 0 && (
              <span className="absolute right-0 top-0 grid size-4 place-items-center rounded-full bg-brand-accent text-[9px] text-white">{count}</span>
            )}
          </Link>
          <Link href="/#bulk" className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand/90">
            Talk to Sales
          </Link>
        </div>
      </div>
    </header>
  );
}
