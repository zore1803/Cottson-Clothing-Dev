"use client";

import { useEffect, useMemo, useState } from "react";
import { SimilarProductsCarousel } from "@/components/similar-products-carousel";
import type { Product } from "@/lib/catalog";
import { relatedProducts, type CartLine } from "@/lib/recommendations";

type Picks = { picks: string[]; topCategory: string | null; signedIn: boolean } | null;

// Under the cart: products that go with what is in it, and, for signed-in customers with past
// orders, products picked from what they have bought before.
export function CartRecommendations({ lines, products }: { lines: CartLine[]; products: Product[] }) {
  const [data, setData] = useState<Picks>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/recommendations")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && setData(d))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const key = lines.map((l) => `${l.slug}:${l.colorId ?? ""}`).join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const related = useMemo(() => relatedProducts(lines, 8, products), [key, products]);

  const picks = useMemo(() => {
    const inCart = new Set(lines.map((l) => l.slug));
    const all = (data?.picks ?? []).map((slug) => products.find((p) => p.slug === slug)).filter((p): p is Product => !!p && !inCart.has(p.slug));
    // Keep the two rows different where we can
    const shown = new Set(related.map((p) => p.slug));
    const distinct = all.filter((p) => !shown.has(p.slug));
    return distinct.length >= 3 ? distinct : all;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, related, key, products]);

  return (
    <>
      {related.length > 0 ? (
        <SimilarProductsCarousel products={related} eyebrow="Complete the order" title="Related products" />
      ) : (
        <SimilarProductsCarousel products={products.slice(0, 8)} eyebrow="Keep exploring" title="Discover our products" />
      )}
      {picks.length > 0 && (
        <SimilarProductsCarousel
          products={picks}
          eyebrow={data?.topCategory ? `Based on your past ${data.topCategory.toLowerCase()} orders` : "Based on your past orders"}
          title="Picked for you"
        />
      )}
    </>
  );
}
