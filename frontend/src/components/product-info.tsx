import { Droplets, Paintbrush, Truck } from "lucide-react";
import { FINISHINGS } from "@/components/design-studio/placement";
import { BULK_TIERS, CUSTOMIZATION_FEE, FREE_SHIPPING_FROM, SHIPPING_FEE } from "@/lib/pricing";
import { formatPrice, type Product } from "@/lib/catalog";

const embroidery = FINISHINGS.filter((f) => f.kind === "embroidery");
const print = FINISHINGS.filter((f) => f.kind === "print");
const range = (list: typeof FINISHINGS) => `up to ${Math.max(...list.map((f) => f.maxCm))} cm`;

/** Fabric & care, how customisation works and delivery — under the order options. */
export function ProductInfo({ product }: { product: Product }) {
  const cards = [
    {
      hue: "var(--pa, #1B7A57)",
      icon: Paintbrush,
      title: "How customisation works",
      body: (
        <ul className="space-y-2.5">
          <li>
            <span className="font-semibold text-[#113858]">Embroidery</span> — stitched logo, {range(embroidery)} wide,
            up to {Math.max(...embroidery.map((f) => f.maxColors))} thread colours.
          </li>
          <li>
            <span className="font-semibold text-[#113858]">Digital print</span> — full-colour transfer, {range(print)} wide.
          </li>
          <li>Add your logo on the left chest, centre chest or right chest.</li>
          <li>
            Customisation adds {formatPrice(CUSTOMIZATION_FEE, product.currency)} per piece to designs made in the studio.
          </li>
        </ul>
      ),
    },
    {
      hue: "#0F7C8A",
      icon: Droplets,
      title: "Fabric & care",
      body: (
        <ul className="space-y-2.5">
          <li>{product.description}</li>
          <li>Machine wash cold with similar colours, inside out.</li>
          <li>Do not bleach. Tumble dry low or line dry.</li>
          <li>Warm iron on the reverse side, away from the logo.</li>
        </ul>
      ),
    },
    {
      hue: "#B8512C",
      icon: Truck,
      title: "Pricing & delivery",
      body: (
        <ul className="space-y-2.5">
          <li>Ready in 7–10 business days after your design is approved.</li>
          <li>Minimum order {product.minBulk} pieces.</li>
          <li>
            Bulk pricing per size:{" "}
            {[...BULK_TIERS].reverse().map((t) => `${t.min}+ pcs ${Math.round(t.discount * 100)}% off`).join(", ")}.
          </li>
          <li>
            Shipping {formatPrice(SHIPPING_FEE, product.currency)}, free on orders above {formatPrice(FREE_SHIPPING_FROM, product.currency)}.
          </li>
        </ul>
      ),
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--pa,#607487)] sm:text-[12px]">Good to know</p>
        <h2 className="text-[30px] font-bold leading-[1.12] tracking-[-0.025em] text-[#113858] sm:text-[40px]">
          Everything about <span className="text-[#113858]/45">your order.</span>
        </h2>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {cards.map(({ icon: Icon, title, body, hue }) => (
          <div
            key={title}
            className="rounded-[24px] border p-6 text-[14px] leading-relaxed text-[#566C82]"
            style={{ background: `color-mix(in srgb, ${hue} 7%, #fff)`, borderColor: `color-mix(in srgb, ${hue} 20%, #fff)` }}
          >
            <span className="mb-4 grid size-12 place-items-center rounded-full text-white" style={{ background: hue }}>
              <Icon className="size-6" strokeWidth={1.6} />
            </span>
            <h3 className="mb-3 text-[17px] font-bold text-[#113858]">{title}</h3>
            {body}
          </div>
        ))}
      </div>
    </section>
  );
}
