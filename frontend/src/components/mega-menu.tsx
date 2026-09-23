"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Item = { title: string; text: string; href: string };
type Column = { heading: string; items: Item[]; cols?: 1 | 2 };
type Menu = { label: string; columns: Column[] };

const MENUS: Menu[] = [
  {
    label: "Products",
    columns: [
      {
        heading: "Categories",
        cols: 2,
        items: [
          { title: "Formal Shirts", text: "Crisp cotton oxfords for the office.", href: "/products?category=Shirts" },
          { title: "Polos", text: "Soft pique polos with a ribbed collar.", href: "/products?category=Polos" },
          { title: "T-Shirts", text: "Soft cotton crew-neck essentials.", href: "/products?category=T-Shirts" },
          { title: "All products", text: "The full COTTSON collection.", href: "/products" },
        ],
      },
      {
        heading: "New Arrivals",
        items: [
          { title: "Contrast Trim Shirt", text: "Our newest statement piece.", href: "/products/contrast-trim-shirt" },
          { title: "Classic Crew Tee", text: "An everyday essential.", href: "/products/classic-white-tee" },
        ],
      },
    ],
  },
  {
    label: "Platform",
    columns: [
      {
        heading: "The COTTSON Platform",
        items: [
          { title: "Design Studio", text: "Put your logo on any garment, live.", href: "/studio" },
          { title: "Live color preview", text: "See every color on the real fabric.", href: "/products/formal-shirt-grey" },
          { title: "Bulk ordering", text: "Mix sizes and colors in one order.", href: "/#bulk" },
          { title: "Pricing", text: "10–20% off from 25 pieces.", href: "/#bulk" },
        ],
      },
      {
        heading: "How it works",
        items: [
          { title: "1. Pick a product", text: "Shirts and polos in premium cotton.", href: "/products" },
          { title: "2. Customize", text: "Color, logo, text and placement.", href: "/studio" },
          { title: "3. We make & ship", text: "Printed or embroidered in 7–10 days.", href: "/#how" },
        ],
      },
    ],
  },
  {
    label: "Solutions",
    columns: [
      {
        heading: "Solutions",
        cols: 2,
        items: [
          { title: "Corporate uniforms", text: "Consistent, comfortable teamwear.", href: "/#bulk" },
          { title: "Events & conferences", text: "Branded shirts for your crew.", href: "/#bulk" },
          { title: "Employee onboarding", text: "Welcome kits with your logo.", href: "/#bulk" },
          { title: "Startups & teams", text: "Small runs from a single piece.", href: "/studio" },
          { title: "Schools & colleges", text: "Club and department merch.", href: "/#bulk" },
          { title: "Talk to Sales", text: "Get a quote within one working day.", href: "/#bulk" },
        ],
      },
    ],
  },
];

export function MegaMenu() {
  const [open, setOpen] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  // Close on navigation and on Escape
  useEffect(() => setOpen(null), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const show = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(label);
  };
  const hide = () => {
    closeTimer.current = setTimeout(() => setOpen(null), 120);
  };

  return (
    <nav className="hidden h-full items-end md:flex" onMouseLeave={hide}>
      {MENUS.map((m) => (
        <div key={m.label} className="relative h-full" onMouseEnter={() => show(m.label)}>
          <button
            type="button"
            aria-expanded={open === m.label}
            onClick={() => setOpen(open === m.label ? null : m.label)}
            className={cn(
              "mt-3.5 h-[calc(100%-0.875rem)] rounded-t-md px-4 text-sm font-semibold transition-colors",
              open === m.label ? "bg-background shadow-[0_-4px_12px_rgba(0,0,0,0.06)]" : "hover:text-brand"
            )}
          >
            {m.label}
          </button>
        </div>
      ))}

      {open && (
        <div
          className="absolute left-1/2 top-full z-50 w-[min(1160px,calc(100vw-2rem))] -translate-x-1/2"
          onMouseEnter={() => show(open)}
        >
          <div className="flex overflow-hidden rounded-b-md border bg-background shadow-2xl">
            {MENUS.find((m) => m.label === open)!.columns.map((col, i) => (
              <div key={col.heading} className={cn("min-w-0", col.cols === 2 ? "flex-[2]" : "flex-1", i > 0 && "border-l")}>
                <div className="border-b bg-muted/50 px-5 py-5 text-3xl font-semibold text-brand">
                  {col.heading}
                  <span className="text-brand-accent">.</span>
                </div>
                <ul className={cn("grid gap-x-8 px-5 py-3", col.cols === 2 && "grid-cols-2")}>
                  {col.items.map((it) => (
                    <li key={it.title}>
                      <Link href={it.href} onClick={() => setOpen(null)} className="group block py-4">
                        <div className="text-xl font-semibold text-brand group-hover:underline">{it.title}</div>
                        <div className="truncate text-muted-foreground">{it.text}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
