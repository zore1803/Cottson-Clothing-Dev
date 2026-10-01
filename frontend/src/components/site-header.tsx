"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ShoppingBag, User } from "lucide-react";
import { useCart, cartCount } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

const WHATSAPP = "https://wa.me/919892297764?text=Hi%2C%20I%20have%20a%20requirement";

const NAV = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Products", href: "/products" },
  { label: "Clients", href: "/clients" },
  { label: "Resources", href: "/resources" },
  { label: "Contact", href: "/contact" },
  { label: "Mockup", href: "/mockup-lab" },
];

type Me = { first_name: string | null; last_name: string | null; email: string; avatar?: string } | null;

// Account link; when signed in it shows the user's initial and a hover card with name and email
function AccountButton({ customer, className }: { customer: Me; className?: string }) {
  const name = customer ? [customer.first_name, customer.last_name].filter(Boolean).join(" ") : "";
  const [broken, setBroken] = useState<string | null>(null);
  return (
    <div className="group relative shrink-0">
      <Link
        href="/account"
        aria-label={customer ? `My account, ${name || customer.email}` : "Sign in"}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-white text-[#113858] transition duration-200",
          className
        )}
      >
        {customer?.avatar && broken !== customer.avatar ? (
          <img src={customer.avatar} alt="" onError={() => setBroken(customer.avatar ?? null)} className="size-full rounded-full object-cover" />
        ) : customer ? (
          <span className="text-[14px] font-bold uppercase">{(customer.first_name || customer.email)[0]}</span>
        ) : (
          <User size={16} strokeWidth={2.2} />
        )}
      </Link>
      <div
        role="tooltip"
        className="pointer-events-none invisible absolute right-0 top-[calc(100%+10px)] z-50 w-max max-w-[240px] translate-y-1 rounded-xl bg-white px-4 py-3 text-left opacity-0 shadow-xl shadow-[#113858]/25 transition duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100"
      >
        {customer ? (
          <>
            {name && <p className="truncate text-[14px] font-semibold text-[#113858]">{name}</p>}
            <p className="truncate text-[13px] text-[#607487]">{customer.email}</p>
          </>
        ) : (
          <p className="text-[13px] font-medium text-[#113858]">Sign in</p>
        )}
      </div>
    </div>
  );
}

const useMounted = () => useSyncExternalStore(() => () => {}, () => true, () => false);

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const items = useCart((s) => s.items);
  const mounted = useMounted();
  const count = mounted ? cartCount(items) : 0;
  const pathname = usePathname();
  const [customer, setCustomer] = useState<Me>(null);

  // Re-check on every navigation so the header updates right after sign in / sign out
  useEffect(() => {
    let live = true;
    const load = () =>
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then((d) => live && setCustomer(d.customer ?? null))
        .catch(() => live && setCustomer(null));
    load();
    // The account page announces profile / photo edits so the header updates without a reload
    window.addEventListener("cottson:account-updated", load);
    return () => {
      live = false;
      window.removeEventListener("cottson:account-updated", load);
    };
  }, [pathname]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 30);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 px-2 sm:px-4 md:px-6 transition-all duration-300 ease-out pointer-events-none",
        isScrolled ? "pt-2 sm:pt-2.5" : "pt-3.5 sm:pt-4"
      )}
    >
      <div
        className={cn(
          "relative mx-auto transition-all duration-300 ease-out pointer-events-auto",
          isScrolled ? "w-[94%] sm:w-[90%] lg:w-[86%] max-w-[1200px]" : "w-full max-w-[1280px]"
        )}
      >
        <div
          className={cn(
            "flex min-h-[56px] sm:min-h-[58px] w-full items-center justify-between gap-1 sm:gap-2 lg:gap-3 rounded-full bg-[#113858] py-2 pl-3.5 pr-2.5 sm:pl-5 sm:pr-3 md:pl-6 md:pr-3.5 transition-all duration-300 ease-out",
            isScrolled
              ? "shadow-[0_12px_35px_rgba(17,56,88,0.28)]"
              : "shadow-[0_8px_30px_rgba(17,56,88,0.18)]"
          )}
        >
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center">
            <img
              src="/cottson.png"
              alt="COTTSON"
              className="h-7 w-auto sm:h-8 md:h-9 max-w-[115px] sm:max-w-[130px] object-contain brightness-0 invert"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center justify-center gap-0.5 lg:flex xl:gap-2">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex h-9 shrink-0 items-center whitespace-nowrap rounded-full px-2 lg:px-2.5 xl:px-3 text-[12.5px] xl:text-[13.5px] font-semibold tracking-[-0.01em] transition-all duration-200",
                    active
                      ? "bg-white/20 text-white"
                      : "text-white/85 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden shrink-0 items-center gap-1.5 sm:gap-2 lg:flex">
            {/* WhatsApp */}
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat on WhatsApp"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#113858] transition duration-200 hover:bg-[#F2F6F9] active:scale-95"
            >
              <Image src="/whatsapp.png" alt="WhatsApp" width={22} height={22} className="size-5" />
            </a>

            <AccountButton customer={customer} className="h-9 w-9 hover:bg-[#F2F6F9] active:scale-95" />

            {/* Cart Link with Badge */}
            <Link
              href="/cart"
              aria-label={`Basket, ${count} items`}
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#113858] transition duration-200 hover:bg-[#F2F6F9] active:scale-95"
            >
              <ShoppingBag size={16} strokeWidth={2.2} />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-[#c8426b] text-[9px] font-bold text-white shadow-xs">
                  {count}
                </span>
              )}
            </Link>

            {/* Get a Quote */}
            <Link
              href="/contact"
              className="flex h-[38px] shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-white px-3.5 sm:px-4 xl:px-5 text-[12.5px] xl:text-[13px] font-bold tracking-[-0.01em] text-[#113858] shadow-xs transition duration-200 hover:bg-[#F2F6F9] active:scale-[0.98]"
            >
              Get a Quote
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex shrink-0 items-center gap-2 lg:hidden">
            <AccountButton customer={customer} className="h-9 w-9" />
            <Link
              href="/cart"
              aria-label={`Basket, ${count} items`}
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#113858]"
            >
              <ShoppingBag size={16} strokeWidth={2} />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-[#c8426b] text-[9px] font-bold text-white">
                  {count}
                </span>
              )}
            </Link>

            <button
              type="button"
              aria-label="Menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#113858] transition active:scale-95 cursor-pointer"
            >
              {menuOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        <div
          className={cn(
            "absolute left-3 right-3 top-[calc(100%+8px)] overflow-hidden rounded-[22px] bg-[#113858] shadow-[0_16px_45px_rgba(17,56,88,0.22)] transition-all duration-300 lg:hidden z-50",
            menuOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"
          )}
        >
          <nav className="max-h-[70vh] overflow-y-auto p-3">
            {NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex min-h-[44px] items-center rounded-xl px-3.5 text-[14px] font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 text-[13.5px] font-medium text-white transition hover:bg-white/15"
              >
                WhatsApp Us
              </a>
              <Link
                href="/contact"
                onClick={() => setMenuOpen(false)}
                className="flex h-11 flex-1 items-center justify-center rounded-xl bg-white text-[13.5px] font-bold text-[#113858]"
              >
                Get a Quote
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;
