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
      {/* Hero: headline centered between two flanking product photos (added later) */}
      <section className="relative isolate overflow-hidden bg-background pb-14 pt-14">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mx-auto grid max-w-xs grid-cols-2 gap-3 sm:hidden">
            <ImageSlot className="aspect-[3/4] w-full" />
            <ImageSlot className="aspect-[3/4] w-full" />
          </div>

          <div className="flex items-center justify-center gap-6">
            <ImageSlot className="hidden aspect-[3/4] w-[180px] shrink-0 sm:grid" />

            <div className="mt-6 w-full max-w-2xl text-center sm:mt-0">
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

            <ImageSlot className="hidden aspect-[3/4] w-[180px] shrink-0 sm:grid" />
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

      {/* Your Brand. Your Colours. Your Style — garment photos go in later */}
      <section className="mx-auto max-w-7xl px-4 pt-8 text-center">
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
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 py-1 [scrollbar-width:none]" />
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
