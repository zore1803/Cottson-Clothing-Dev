"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useCart, cartTotal, unitPriceOf } from "@/lib/cart-store";
import { shippingFor } from "@/lib/pricing";
import { formatPrice } from "@/lib/catalog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const useMounted = () => useSyncExternalStore(() => () => {}, () => true, () => false);

// Submits to /api/checkout, which creates the order in Medusa (Razorpay comes next).
export default function CheckoutPage() {
  const { items, clear } = useCart();
  const mounted = useMounted();
  const [placed, setPlaced] = useState<{ displayId: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!mounted) return null;

  const subtotal = cartTotal(items);
  const shipping = shippingFor(subtotal);

  if (placed)
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-3xl font-semibold">Thank you!</h1>
        <p className="mt-3 text-muted-foreground">
          Order #{placed.displayId} is confirmed · {formatPrice(placed.total)}. Online payment (Razorpay) is not connected yet, so no payment was taken.
        </p>
        <Link href="/products" className={cn(buttonVariants({ size: "lg" }), "mt-6 h-11 px-6")}>Continue shopping</Link>
      </div>
    );

  if (!items.length)
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Nothing to check out</h1>
        <Link href="/products" className={cn(buttonVariants({ size: "lg" }), "mt-6 h-11 px-6")}>Shop</Link>
      </div>
    );

  const fields: [string, string, string][] = [
    ["name", "Full name", "text"], ["email", "Email", "email"], ["phone", "Phone", "tel"],
    ["address", "Address", "text"], ["city", "City", "text"], ["pincode", "PIN code", "text"],
  ];

  return (
    <form
      className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_340px]"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
        setBusy(true);
        try {
          const res = await fetch("/api/checkout", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              customer: f,
              items: items.map((i) => ({ slug: i.slug, colorId: i.colorId, size: i.size, qty: i.qty, designId: i.designId })),
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          clear();
          setPlaced({ displayId: data.displayId, total: data.total });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Checkout failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {fields.map(([id, label, type]) => (
            <div key={id} className={cn("grid gap-2", (id === "address" || id === "name") && "sm:col-span-2")}>
              <Label htmlFor={id}>{label}</Label>
              <Input id={id} name={id} type={type} required className="h-10" />
            </div>
          ))}
        </div>
      </div>
      <aside className="h-fit rounded-2xl border p-6 lg:mt-16">
        <ul className="space-y-2 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4">
              <span>{i.qty} × {i.title} <span className="text-muted-foreground">({i.colorName}, {i.size})</span></span>
              <span>{formatPrice(i.qty * unitPriceOf(i))}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 border-t pt-4 text-sm">
          <div className="flex justify-between"><span>Shipping</span><span>{shipping ? formatPrice(shipping) : "Free"}</span></div>
          <div className="flex justify-between font-semibold"><span>Total</span><span>{formatPrice(subtotal + shipping)}</span></div>
        </div>
        <Button type="submit" size="lg" className="mt-6 h-11 w-full" disabled={busy}>{busy ? "Placing order…" : "Place order"}</Button>
      </aside>
    </form>
  );
}
