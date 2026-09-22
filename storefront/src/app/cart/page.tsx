"use client";

import Link from "next/link";
import Image from "next/image";
import { useSyncExternalStore } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart, cartTotal, unitPriceOf } from "@/lib/cart-store";
import { shippingFor, bulkDiscount, CUSTOMIZATION_FEE } from "@/lib/pricing";
import { getProduct, variantUrl, formatPrice } from "@/lib/catalog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const useMounted = () => useSyncExternalStore(() => () => {}, () => true, () => false);

export default function CartPage() {
  const { items, setQty, remove } = useCart();
  const mounted = useMounted();
  if (!mounted) return <div className="mx-auto max-w-5xl px-4 py-12" />;

  const subtotal = cartTotal(items);
  const shipping = shippingFor(subtotal);

  if (!items.length)
    return (
      <div className="mx-auto max-w-5xl px-4 py-24 text-center">
        <h1 className="text-3xl font-semibold">Your cart is empty</h1>
        <Link href="/products" className={cn(buttonVariants({ size: "lg" }), "mt-6 h-11 px-6")}>
          Start shopping
        </Link>
      </div>
    );

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_340px]">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Cart</h1>
        <ul className="mt-8 divide-y border-y">
          {items.map((i) => {
            const p = getProduct(i.slug);
            const img = i.preview ?? (p ? variantUrl(p, i.colorId) : "");
            return (
              <li key={i.id} className="flex gap-4 py-5">
                <div className="w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {img && <Image src={img} alt="" width={240} height={320} unoptimized={img.startsWith("data:")} className="aspect-[3/4] w-full object-cover" />}
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between gap-4">
                    <div>
                      <div className="font-medium">{i.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {i.colorName} · Size {i.size}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatPrice(unitPriceOf(i) * i.qty)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatPrice(unitPriceOf(i))} each
                        {bulkDiscount(i.qty) > 0 && ` · bulk −${Math.round(bulkDiscount(i.qty) * 100)}%`}
                        {i.designId && ` · incl. ${formatPrice(CUSTOMIZATION_FEE)} logo`}
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center gap-3 pt-3">
                    <div className="flex items-center rounded-lg border">
                      <button className="grid size-8 place-items-center" onClick={() => setQty(i.id, i.qty - 1)} aria-label="Fewer">
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm">{i.qty}</span>
                      <button className="grid size-8 place-items-center" onClick={() => setQty(i.id, i.qty + 1)} aria-label="More">
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground" onClick={() => remove(i.id)} aria-label="Remove">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <aside className="h-fit rounded-2xl border p-6 lg:mt-16">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>{shipping ? formatPrice(shipping) : "Free"}</span></div>
        </div>
        <div className="mt-4 flex justify-between border-t pt-4 font-semibold">
          <span>Total</span>
          <span>{formatPrice(subtotal + shipping)}</span>
        </div>
        <Link href="/checkout" className={cn(buttonVariants({ size: "lg" }), "mt-6 h-11 w-full")}>
          Checkout
        </Link>
      </aside>
    </div>
  );
}
