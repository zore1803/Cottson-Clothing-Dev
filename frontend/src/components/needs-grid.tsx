import { ImageIcon } from "lucide-react";

const WHATSAPP = "https://wa.me/919892297764?text=Hi%2C%20I%20have%20a%20requirement";

const CARDS = [
  {
    title: "Events & Exhibitions",
    text: "Custom tees and polos for your next conference, expo or product launch.",
    cta: "Order for Your Next Event",
  },
  {
    title: "Everyday Office Wear",
    text: "Keep your team looking sharp every day. Formal shirts and polos with your logo.",
    cta: "Get a Quote for Your Team",
  },
  {
    title: "Team Outings & Offsites",
    text: "Matching custom tees for team outings and company offsites.",
    cta: "Outfit Your Next Offsite",
  },
];

export function NeedsGrid() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-20 text-center">
      <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">Custom Clothing for Every Corporate Need</h2>
      <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
        Dress your team for the office, events and everything in between. Delivered in 7 to 10 days, starting at just
        25 pieces.
      </p>
      <div className="mt-10 grid gap-8 sm:grid-cols-3">
        {CARDS.map((c) => (
          <div key={c.title}>
            <div className="grid aspect-[4/3] place-items-center rounded-2xl border-2 border-dashed bg-muted text-muted-foreground">
              <ImageIcon className="size-6" strokeWidth={1.5} />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-brand">{c.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{c.text}</p>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-grid h-10 place-items-center rounded-full bg-brand px-6 text-sm font-semibold text-white hover:bg-brand/90"
            >
              {c.cta}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
