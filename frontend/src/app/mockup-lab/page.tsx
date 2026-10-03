import type { Metadata } from "next";
import { getProduct } from "@/lib/catalog";
import { uiStateFromParams } from "@/lib/mockup/mannequinUrl";
import { hasMannequin, mannequinDefaultsFor } from "@/lib/mockup/products";
import { MockupLab } from "./mockup-lab";

// Mockup page (linked as "Mockup" in the navbar): pick a product, recolour each part of the
// garment and preview a logo — on the full mannequin (polo family) or the ghost template.
export const metadata: Metadata = { title: "Mockup", robots: { index: false } };

// ?product=<slug> opens on that product (e.g. from a product page's "Customize" button); the
// mannequin state (view, colours, placement, …) is restored from the rest of the URL.
export default async function MockupLabPage({ searchParams }: PageProps<"/mockup-lab">) {
  const params = await searchParams;
  const { product } = params;
  const slug = typeof product === "string" && getProduct(product) ? product : "indus-01";
  const initialUi = uiStateFromParams(params, mannequinDefaultsFor(slug));
  // Products without a mannequin family only have the ghost style
  if (!hasMannequin(slug)) initialUi.style = "ghost";
  return <MockupLab key={slug} initialSlug={slug} initialUi={initialUi} debugMasks={params.debug === "masks"} perf={params.perf === "1"} />;
}
