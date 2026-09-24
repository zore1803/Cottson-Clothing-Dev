import Image from "next/image";

const WHATSAPP = "https://wa.me/919892297764?text=Hi%2C%20I%20have%20a%20requirement";

const CARDS = [
  {
    title: "Events & Exhibitions",
    text: "Custom tees and polos for your next conference, expo or product launch.",
    cta: "Order for Your Next Event",
    image: "/products/contrast-trim-shirt/photo.jpg",
  },
  {
    title: "Everyday Office Wear",
    text: "Keep your team looking sharp every day. Formal shirts and polos with your logo.",
    cta: "Get a Quote for Your Team",
    image: "/products/formal-shirt-grey/photo.jpg",
  },
  {
    title: "Team Outings & Offsites",
    text: "Matching custom tees for team outings and company offsites.",
    cta: "Outfit Your Next Offsite",
    image: "/products/classic-white-tee/photo.jpg",
  },
];

export function NeedsGrid() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-20">
      <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
        Custom Clothing for Every Corporate Need<span className="text-brand-accent">.</span>
      </h2>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Dress your team for the office, events and everything in between. Delivered in 7 to 10 days, starting at just
        25 pieces.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {CARDS.map((c) => (
          <div key={c.title} className="overflow-hidden rounded-2xl border">
            <div className="relative aspect-[4/3]">
              <Image src={c.image} alt={c.title} fill sizes="(min-width: 640px) 33vw, 100vw" className="object-cover" />
            </div>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-brand">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.text}</p>
              <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
                {c.cta} →
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
