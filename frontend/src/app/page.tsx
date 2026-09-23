import Link from "next/link";
import Image from "next/image";
import { Check, MessageSquare, Palette, Shirt, Truck, Users } from "lucide-react";
import { PRODUCTS, COLORS, variantUrl } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QuoteForm } from "@/components/quote-form";
import { HeroShowcase } from "@/components/hero-showcase";

export const revalidate = 3600; // ISR: rebuilt at most hourly, served from the CDN

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-muted/60 to-background">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-12 lg:grid-cols-[1.05fr_1fr] lg:py-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm font-medium text-brand">
              <span className="size-2 rounded-full bg-brand-accent" /> Custom cotton clothing
            </span>
            <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight text-brand sm:text-6xl xl:text-7xl">
              Your team.
              <br />
              Your colors.
              <br />
              Our cotton<span className="text-brand-accent">.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Premium shirts, polos and tees in any color, with your logo. See it on the real garment before you order,
              from a single piece to a thousand.
            </p>
            <ul className="mt-8 grid max-w-lg gap-x-8 gap-y-3 font-semibold sm:grid-cols-2">
              {["Premium cotton", "Any color, any logo", "Live design studio", "Bulk pricing from 25", "Made to order", "Delivered in 7–10 days"].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand/10">
                    <Check className="size-4 text-brand" strokeWidth={3} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/studio" className="rounded-lg bg-brand px-7 py-4 text-lg font-semibold text-white shadow-sm hover:bg-brand/90">
                Start designing
              </Link>
              <Link href="/products" className="rounded-lg border bg-background px-7 py-4 text-lg font-semibold text-brand hover:bg-muted">
                Browse catalog
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-8 border-t pt-6">
              {[["12", "colors in stock"], ["1+", "pieces minimum"], ["7–10", "days delivery"]].map(([n, l]) => (
                <div key={l}>
                  <div className="text-2xl font-bold text-brand">{n}</div>
                  <div className="text-sm text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="mx-auto w-full max-w-[560px]">
            <HeroShowcase />
          </div>
        </div>
        <Link
          href="/#bulk"
          aria-label="Chat with us"
          className="fixed bottom-6 right-6 z-50 grid size-16 place-items-center rounded-full bg-brand text-white shadow-lg hover:bg-brand/90"
        >
          <MessageSquare className="size-7" />
        </Link>
      </section>

      {/* Color strip */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 py-6">
          <span className="mr-2 text-sm text-muted-foreground">{COLORS.length} colors in stock:</span>
          {COLORS.map((c) => (
            <span key={c.id} title={c.name} className="size-6 rounded-full ring-1 ring-border" style={{ background: c.hex }} />
          ))}
        </div>
      </section>

      {/* Products */}
      <section className="mx-auto max-w-7xl px-4 pt-20">
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-semibold tracking-tight">Bestsellers</h2>
          <Link href="/products" className="text-sm font-medium hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-24">
        <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-4">
          {[
            [Shirt, "Pick a product", "Shirts and polos in premium cotton."],
            [Palette, "Choose any color", "See it on the real garment, folds and all."],
            [Users, "Add your logo", "Upload your artwork, place and size it."],
            [Truck, "We make & ship", "Printed or embroidered, delivered in 7–10 days."],
          ].map(([Icon, title, text], i) => {
            const I = Icon as typeof Shirt;
            return (
              <div key={i} className="rounded-2xl border p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-muted">
                    <I className="size-5" />
                  </span>
                  <span className="text-sm text-muted-foreground">Step {i + 1}</span>
                </div>
                <div className="mt-4 font-medium">{title as string}</div>
                <p className="mt-1 text-sm text-muted-foreground">{text as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bulk */}
      <section id="bulk" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-24">
        <div className="grid items-center gap-10 overflow-hidden rounded-3xl bg-foreground p-10 text-background lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Uniforms and merch for your team</h2>
            <p className="mt-4 max-w-md opacity-80">
              Order 25+ pieces and save up to 20%. Mix sizes and colors in one order, with your logo embroidered or printed.
            </p>
            <div className="mt-6 grid max-w-sm grid-cols-3 gap-3 text-center">
              {[["25+", "10% off"], ["50+", "15% off"], ["100+", "20% off"]].map(([q, d]) => (
                <div key={q} className="rounded-xl bg-background/10 p-3">
                  <div className="text-xl font-semibold">{q}</div>
                  <div className="text-xs opacity-80">{d}</div>
                </div>
              ))}
            </div>
            <Link href="/studio" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "mt-8 h-11 px-6")}>
              Design for your team
            </Link>
          </div>
          <QuoteForm />
        </div>
      </section>
    </>
  );
}
