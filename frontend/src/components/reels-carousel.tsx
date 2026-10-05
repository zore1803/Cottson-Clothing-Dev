"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";

const REELS = Array.from({ length: 6 }, (_, i) => i);

/** Placeholder gallery for behind-the-scenes reels/shorts — swap each tile for a real <video>/embed once footage exists. */
export function ReelsCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.75;
      scrollRef.current.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand sm:text-3xl">Behind the scenes</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">A peek into how we design, print and pack every order.</p>
        </div>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <button
            onClick={() => scroll("left")}
            className="grid size-10 place-items-center rounded-full border bg-background shadow-sm hover:bg-muted"
            aria-label="Scroll left"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="grid size-10 place-items-center rounded-full border bg-background shadow-sm hover:bg-muted"
            aria-label="Scroll right"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 snap-x snap-mandatory sm:mx-0 sm:gap-6 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {REELS.map((i) => (
          <div
            key={i}
            className="flex aspect-9/16 w-40 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted text-muted-foreground sm:w-48"
          >
            <span className="grid size-12 place-items-center rounded-full bg-background shadow-sm">
              <Play className="size-5 fill-brand text-brand" />
            </span>
            <span className="text-xs">Reel {i + 1}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
