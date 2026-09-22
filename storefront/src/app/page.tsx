import Link from "next/link";
import Image from "next/image";
import { Check, MessageSquare, Palette, Shirt, Truck, Users } from "lucide-react";
import { PRODUCTS, COLORS, variantUrl } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QuoteForm } from "@/components/quote-form";

export const revalidate = 3600; // ISR: rebuilt at most hourly, served from the CDN

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        {/* Studio backdrop color on the left, model photo on the right */}
        <div className="absolute inset-0 -z-20 bg-[#b9bcc2]" />
        <div className="absolute inset-y-0 right-0 -z-10 w-full md:w-[58%]">
          <Image
            src="/products/polo-black/variants/white.webp"
            alt="Model wearing a white COTTSON polo"
            fill
            priority
            sizes="(min-width: 768px) 58vw, 100vw"
            className="object-cover object-[50%_15%]"
          />
          <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#b9bcc2] to-transparent" />
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-14">
          <div className="max-w-[655px] bg-background px-8 pb-14 pt-16 sm:px-16">
            <h1 className="text-5xl font-bold leading-[1.1] tracking-tight text-brand sm:text-7xl">
              Custom cotton clothing, made yours<span className="text-brand-accent">.</span>
            </h1>
            <ul className="mt-12 grid gap-x-10 gap-y-3 text-lg font-semibold sm:grid-cols-2">
              {["Premium cotton", "Any color, any logo", "Live design studio", "Bulk pricing from 25", "Made to order", "Delivered in 7–10 days"].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <Check className="size-6 shrink-0 text-brand" strokeWidth={3} /> {t}
                </li>
              ))}
            </ul>
            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              <Link href="/#bulk" className="grid h-15 place-items-center rounded-md bg-brand py-4 text-lg font-semibold text-white hover:bg-brand/90">
                Talk to us
              </Link>
              <Link href="/products" className="grid h-15 place-items-center rounded-md bg-muted py-4 text-lg font-semibold text-brand shadow-sm hover:bg-muted/70">
                Browse catalog
              </Link>
            </div>
          </div>
          <div className="mt-2 inline-flex items-center gap-4 bg-background px-5 py-3">
            <span className="grid size-12 place-items-center rounded-full border-2 border-brand text-xs font-bold text-brand">100%</span>
            <div>
              <div className="text-lg font-semibold">Pure cotton</div>
              <div>Designed and made in India</div>
            </div>
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
