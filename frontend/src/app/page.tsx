import Link from "next/link";
import { ImageIcon, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";

const WHATSAPP = "https://wa.me/919892297764?text=Hi%2C%20I%20have%20a%20requirement";

function ImageSlot({ className }: { className?: string }) {
  return (
    <div className={`grid place-items-center rounded-2xl border-2 border-dashed bg-muted text-muted-foreground ${className ?? ""}`}>
      <ImageIcon className="size-6" strokeWidth={1.5} />
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      {/* Hero: centered headline flanked by two product photos (added later) */}
      <section className="relative isolate overflow-hidden bg-background pb-14 pt-10">
        <div className="mx-auto grid max-w-5xl grid-cols-3 items-end gap-2 px-4 sm:gap-4">
          <ImageSlot className="aspect-[3/4]" />
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium text-brand">
              <span className="size-1.5 rounded-full bg-brand-accent" /> Custom corporate clothing
            </span>
          </div>
          <ImageSlot className="aspect-[3/4]" />
        </div>

        <div className="relative mx-auto mt-6 max-w-2xl px-4 text-center">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-brand sm:text-5xl">
            Custom Corporate Clothing for Mumbai Companies<span className="text-brand-accent">.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground sm:text-base">
            Branded T-shirts, polos &amp; shirts for events, office staff &amp; team outings. MOQ 25 pieces.
            Delivered in 7–10 days.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="grid h-11 place-items-center rounded-full bg-brand px-7 text-sm font-semibold text-white shadow-sm hover:bg-brand/90"
            >
              Talk To Our Team
            </a>
            <Link href="/products" className="grid h-11 place-items-center rounded-full border border-brand px-7 text-sm font-semibold text-brand hover:bg-muted">
              View Products
            </Link>
          </div>
        </div>

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

      {/* Your Brand. Your Colours. Your Style — one hero garment photo, then a scrollable
          row of client-branded garment photos (both added later). */}
      <section className="mx-auto max-w-7xl px-4 pt-8 text-center">
        <ImageSlot className="mx-auto aspect-[4/5] w-full max-w-xl" />

        <h2 className="mt-8 text-3xl font-bold tracking-tight text-brand sm:text-4xl">
          Your Brand. Your Colours. Your Style
        </h2>
        <p className="mt-3 text-muted-foreground">Classic polos, custom collars and everything in between.</p>

        <div className="relative mt-8">
          <button
            type="button"
            aria-label="Previous"
            className="absolute -left-4 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border bg-background shadow-sm hover:bg-muted"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 py-1 [scrollbar-width:none]">
            {Array.from({ length: 7 }).map((_, i) => (
              <ImageSlot key={i} className="aspect-[3/4] w-40 shrink-0 snap-start sm:w-44" />
            ))}
          </div>
          <button
            type="button"
            aria-label="Next"
            className="absolute -right-4 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border bg-background shadow-sm hover:bg-muted"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </section>
    </>
  );
}
