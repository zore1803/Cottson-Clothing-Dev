import Link from "next/link";
import Image from "next/image";
import { Check, MessageSquare } from "lucide-react";
import { COLORS } from "@/lib/catalog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QuoteForm } from "@/components/quote-form";
import { ProductTabs } from "@/components/product-tabs";
import { DesignShowcase } from "@/components/design-showcase";
import { TrustTicker } from "@/components/trust-ticker";
import { NeedsGrid } from "@/components/needs-grid";
import { StatsRow } from "@/components/stats-row";
import { FaqAccordion } from "@/components/faq-accordion";

const WHATSAPP = "https://wa.me/919892297764?text=Hi%2C%20I%20have%20a%20requirement";

export const revalidate = 3600; // ISR: rebuilt at most hourly, served from the CDN

export default function HomePage() {
  return (
    <>
      {/* Hero: a white card sits over a full-bleed photo, like a storefront window display */}
      <section className="relative isolate min-h-[640px] overflow-hidden bg-[#b9bcc2]">
        <Image
          src="/hero-bg.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover"
        />

        <div className="relative mx-auto max-w-7xl px-4 pb-16">
          <div className="max-w-[500px] rounded-b-2xl bg-background px-5 pb-11 pt-11 shadow-2xl sm:px-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2 py-0.5 text-xs font-medium text-brand">
              <span className="size-1.5 rounded-full bg-brand-accent" /> Custom corporate clothing
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-brand sm:text-5xl">
              Custom Corporate Clothing for Mumbai Companies<span className="text-brand-accent">.</span>
            </h1>
            <p className="mt-4 text-sm text-muted-foreground sm:text-base">
              Branded T-shirts, polos &amp; shirts for events, office staff &amp; team outings. MOQ 25 pieces.
              Delivered in 7–10 days.
            </p>
            <div className="mt-8 grid gap-2 sm:grid-cols-2">
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="grid h-12 place-items-center rounded-md bg-brand text-sm font-semibold text-white shadow-sm hover:bg-brand/90"
              >
                Talk To Our Team
              </a>
              <Link href="/products" className="grid h-12 place-items-center rounded-md bg-muted text-sm font-semibold text-brand hover:bg-muted/70">
                View Products
              </Link>
            </div>
          </div>

          {/* Small badge card, peeking out below the main card like a certification tag */}
          <div className="mt-6 inline-flex items-center gap-4 rounded-2xl bg-background px-6 py-4 shadow-lg">
            <span className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-brand text-xs font-bold text-brand">
              100%
            </span>
            <div>
              <div className="text-lg font-semibold text-brand">Pure cotton</div>
              <div className="text-sm text-muted-foreground">Designed and made in India</div>
            </div>
          </div>
        </div>

        {/* Floating second product photo, standing on the ground at the bottom of the hero */}
        <Link
          href="/products/polo-black"
          className="absolute bottom-0 right-8 hidden h-[560px] w-[420px] transition-transform hover:scale-[1.02] lg:block"
        >
          <Image
            src="/products/polo-black/cutout.png"
            alt="Model wearing a COTTSON essential polo"
            fill
            sizes="420px"
            unoptimized
            className="object-contain object-bottom"
          />
        </Link>

        <a
          href={WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          className="fixed bottom-6 right-6 z-50 grid size-16 place-items-center rounded-full bg-brand text-white shadow-lg hover:bg-brand/90"
        >
          <MessageSquare className="size-7" />
        </a>
      </section>

      <TrustTicker />

      {/* Your Brand. Your Colours. Your Style */}
      <section className="mx-auto max-w-7xl px-4 pt-16 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
          Your Brand. Your Colours. Your Style<span className="text-brand-accent">.</span>
        </h2>
        <p className="mt-3 text-muted-foreground">Classic polos, custom collars and everything in between.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {COLORS.map((c) => (
            <span key={c.id} title={c.name} className="size-8 rounded-full ring-1 ring-border" style={{ background: c.hex }} />
          ))}
        </div>
      </section>

      <ProductTabs />

      {/* Trusted by 250+ companies */}
      <section className="mx-auto max-w-7xl px-4 pt-16">
        <div className="rounded-2xl border bg-muted/30 py-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">Trusted by 250+ companies across Mumbai</p>
        </div>
      </section>

      <NeedsGrid />

      <DesignShowcase />

      <StatsRow />

      {/* Final CTA */}
      <section className="mx-auto max-w-7xl px-4 pt-20">
        <div className="rounded-3xl bg-foreground px-8 py-14 text-center text-background">
          <p className="text-sm font-semibold uppercase tracking-wider opacity-70">Ready To Create Your Corporate Clothing?</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
            Talk to our team to discuss your requirements, explore customisation options and get a tailored solution
            for your business.
          </h2>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "mt-8 h-11 px-8")}
          >
            Talk To Our Team
          </a>
        </div>
      </section>

      <FaqAccordion />

      {/* Bulk pricing + quote form */}
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
