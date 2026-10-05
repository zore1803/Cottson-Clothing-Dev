import { FINISHINGS } from "@/components/design-studio/placement";
import { BULK_TIERS, CUSTOMIZATION_FEE, FREE_SHIPPING_FROM, SHIPPING_FEE } from "@/lib/pricing";
import { formatPrice, type Product } from "@/lib/catalog";

const embroidery = FINISHINGS.filter((f) => f.kind === "embroidery");
const print = FINISHINGS.filter((f) => f.kind === "print");
const maxCm = (list: typeof FINISHINGS) => Math.max(...list.map((f) => f.maxCm));

/** Spec-sheet style details under the order options: customisation, fabric & care, pricing, delivery. */
export function ProductInfo({ product }: { product: Product }) {
  const tiers = [...BULK_TIERS].reverse();
  const rows: { label: string; body: React.ReactNode }[] = [
    {
      label: "Customisation",
      body: (
        <>
          <p>
            <strong className="font-semibold text-[#113858]">Embroidery</strong> — stitched logo up to {maxCm(embroidery)} cm
            wide, up to {Math.max(...embroidery.map((f) => f.maxColors))} thread colours.
          </p>
          <p className="mt-2">
            <strong className="font-semibold text-[#113858]">Digital print</strong> — full-colour transfer up to {maxCm(print)} cm wide.
          </p>
          <p className="mt-2">
            Placed on the left chest, centre chest or right chest. Designs made in the studio add{" "}
            {formatPrice(CUSTOMIZATION_FEE, product.currency)} per piece.
          </p>
        </>
      ),
    },
    {
      label: "Fabric & care",
      body: (
        <>
          <p>{product.description}</p>
          <p className="mt-2">
            Machine wash cold with similar colours, inside out. Do not bleach. Tumble dry low or line dry. Warm iron on the
            reverse side, away from the logo.
          </p>
        </>
      ),
    },
    {
      label: "Bulk pricing",
      body: (
        <table className="w-full max-w-sm text-left">
          <tbody>
            <tr className="border-b border-[#113858]/10">
              <td className="py-1.5">1–{tiers[0].min - 1} pieces</td>
              <td className="py-1.5 text-right">{formatPrice(product.price, product.currency)} each</td>
            </tr>
            {tiers.map((t, i) => (
              <tr key={t.min} className={i < tiers.length - 1 ? "border-b border-[#113858]/10" : ""}>
                <td className="py-1.5">{i === tiers.length - 1 ? `${t.min}+` : `${t.min}–${tiers[i + 1].min - 1}`} pieces</td>
                <td className="py-1.5 text-right">{Math.round(t.discount * 100)}% off</td>
              </tr>
            ))}
          </tbody>
        </table>
      ),
    },
    {
      label: "Delivery",
      body: (
        <p>
          Ready in 7–10 business days after your design is approved. Minimum order {product.minBulk} pieces. Shipping{" "}
          {formatPrice(SHIPPING_FEE, product.currency)}, free on orders above {formatPrice(FREE_SHIPPING_FROM, product.currency)}.
        </p>
      ),
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <div className="grid gap-8 border-t border-[#113858]/15 pt-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <h2 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-[#113858] sm:text-[32px]">Order details</h2>
        <dl>
          {rows.map(({ label, body }, i) => (
            <div
              key={label}
              className={`grid gap-2 py-5 sm:grid-cols-[170px_1fr] sm:gap-8 ${i === 0 ? "pt-0" : "border-t border-[#113858]/10"}`}
            >
              <dt className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#607487]">{label}</dt>
              <dd className="text-[15px] leading-relaxed text-[#3d5469]">{body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
