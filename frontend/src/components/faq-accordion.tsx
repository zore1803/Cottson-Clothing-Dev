"use client";

import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  {
    label: "About Cottson",
    items: [
      {
        q: "What does Cottson Clothing offer?",
        a: "Branded T-shirts, polos and formal shirts in premium cotton — made to order for corporate events, office staff and team outings, with your logo printed or embroidered.",
      },
      {
        q: "Where is Cottson Clothing based?",
        a: "We're based in Thane, Maharashtra, and currently deliver across Mumbai, Thane and Navi Mumbai.",
      },
    ],
  },
  {
    label: "Order Related",
    items: [
      {
        q: "What is your minimum quantity order (MOQ)?",
        a: "Our MOQ is 25 pieces per order. You can mix sizes and colors within that order.",
      },
      {
        q: "Do you offer custom or made-to-measure clothing?",
        a: "We offer custom branding — your logo, colors and placement — on our standard size range (S–XXL). We don't currently do made-to-measure tailoring.",
      },
    ],
  },
  {
    label: "General",
    items: [
      { q: "How long does delivery take?", a: "Most orders are delivered in 7–10 days from order confirmation." },
      { q: "How do I get a quote?", a: "Message our team on WhatsApp with your requirement, or use the Design Studio to build your design first." },
    ],
  },
];

export function FaqAccordion() {
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section className="mx-auto max-w-7xl px-4 pt-24">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
          Frequently Asked Questions<span className="text-brand-accent">.</span>
        </h2>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Looking for something?"
            className="h-10 w-56 rounded-full border bg-background pl-9 pr-4 text-sm outline-none focus:border-brand"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-6 border-b">
        {CATEGORIES.map((cat, i) => (
          <button
            key={cat.label}
            type="button"
            onClick={() => {
              setTab(i);
              setOpen(null);
            }}
            className={cn(
              "-mb-px border-b-2 pb-3 text-sm font-semibold transition-colors",
              i === tab ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-brand"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="mt-4 divide-y">
        {CATEGORIES[tab].items.map(({ q, a }) => {
          const isOpen = open === q;
          return (
            <div key={q}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : q)}
                className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-brand"
              >
                {q}
                <ChevronDown className={cn("size-4 shrink-0 transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && <p className="pb-4 text-sm text-muted-foreground">{a}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
