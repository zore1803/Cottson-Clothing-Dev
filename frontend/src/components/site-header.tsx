"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { useCart, cartCount } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

const WHATSAPP = "https://wa.me/919892297764?text=Hi%2C%20I%20have%20a%20requirement";

const NAV = [
  ["Home", "/"],
  ["About Us", "#"],
  ["Products", "/products"],
  ["Customisation", "/studio"],
  ["Clients", "#"],
  ["Resources", "#"],
  ["Process", "#"],
  ["Contact Us", "/#contact"],
];

// The cart lives in localStorage, so only show its count after hydration
const useMounted = () => useSyncExternalStore(() => () => {}, () => true, () => false);

export function SiteHeader() {
  const items = useCart((s) => s.items);
  const mounted = useMounted();
  const count = mounted ? cartCount(items) : 0;
  const pathname = usePathname();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-24 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          {/* Logo mark — placeholder until the real asset is added */}
          <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-brand" aria-hidden />
          <span className="text-lg font-extrabold uppercase leading-tight tracking-tight text-brand">
            Cottson
            <br />
            Clothing
          </span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 rounded-full bg-brand px-2 py-1.5 lg:flex">
          {NAV.map(([label, href]) => {
            const active = href === "/" ? pathname === "/" : pathname === href;
            return (
              <Link
                key={label}
                href={href}
                className={cn(
                  "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active ? "bg-background text-brand" : "text-background/90 hover:bg-background/10"
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-4">
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            className="grid size-10 place-items-center rounded-full bg-[#25D366] text-white hover:opacity-90"
          >
            <MessageCircle className="size-5" fill="currentColor" strokeWidth={0} />
          </a>
          <Link href="/cart" className="relative grid size-10 place-items-center rounded-full bg-brand text-white hover:bg-brand/90" aria-label={`Basket, ${count} items`}>
            <ShoppingBag className="size-4" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-brand-accent text-[9px] font-semibold text-white">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
