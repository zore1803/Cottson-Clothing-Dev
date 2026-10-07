"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useCart, cartTotal, unitPriceOf } from "@/lib/cart-store";
import { shippingFor } from "@/lib/pricing";
import { formatPrice } from "@/lib/catalog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { DummyRazorpayModal, type RazorpayResult } from "@/components/payments/dummy-razorpay";
import { RazorpayCheckout } from "@/components/payments/razorpay-checkout";

const useMounted = () => useSyncExternalStore(() => () => {}, () => true, () => false);

// Two steps: /api/checkout builds the cart and opens a payment order, the payment modal collects the
// payment, then /api/checkout/confirm verifies it and places the order. The modal is a dummy Razorpay
// for now (see lib/razorpay-dummy.ts).
type PaymentOrder = { razorpayOrderId: string; amount: number; email: string; name: string; phone: string; keyId: string; mode: string };

export default function CheckoutPage() {
  const { items, clear } = useCart();
  const mounted = useMounted();
  const [placed, setPlaced] = useState<{ displayId: number; total: number; test: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [payment, setPayment] = useState<PaymentOrder | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [prefill, setPrefill] = useState<Record<string, string>>({});

  // Signed-in customers get their saved details filled in
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(({ customer: c, admin }) => {
        if (admin) setIsAdmin(true);
        if (!c) return;
        const a = c.addresses?.find((x: { is_default_shipping: boolean }) => x.is_default_shipping) ?? c.addresses?.[0];
        setPrefill({
          name: [c.first_name, c.last_name].filter(Boolean).join(" "),
          email: c.email,
          phone: a?.phone || c.phone || "",
          address: [a?.address_1, a?.address_2].filter(Boolean).join(", "),
          city: a?.city ?? "",
          pincode: a?.postal_code ?? "",
        });
      })
      .catch(() => {});
  }, []);

  if (!mounted) return null;

  const subtotal = cartTotal(items);
  const shipping = shippingFor(subtotal);

  if (isAdmin)
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Checkout is for customers</h1>
        <p className="mt-3 text-muted-foreground">You are signed in as an admin. Orders are managed from the admin dashboard; sign out to place an order as a customer.</p>
        <Link href="/admin" className={cn(buttonVariants({ size: "lg" }), "mt-6 h-11 px-6")}>Go to admin dashboard</Link>
      </div>
    );

  if (placed)
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-3xl font-semibold">Thank you!</h1>
        <p className="mt-3 text-muted-foreground">
          Order #{placed.displayId} is confirmed · {formatPrice(placed.total)}. {placed.test ? "Payment received (test mode, no money was charged)." : "Payment received. Thank you!"}
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

  async function confirmPayment(r: RazorpayResult) {
    const test = payment?.mode !== "razorpay";
    setPayment(null);
    setBusy(true);
    try {
      const res = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(r),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      clear();
      setPlaced({ displayId: data.displayId, total: data.total, test });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place your order");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {payment?.mode === "razorpay" && (
        <RazorpayCheckout
          keyId={payment.keyId}
          orderId={payment.razorpayOrderId}
          amount={payment.amount}
          email={payment.email}
          name={payment.name}
          phone={payment.phone}
          description={`${items.reduce((n, i) => n + i.qty, 0)} pieces · Custom corporate clothing`}
          onSuccess={confirmPayment}
          onFailure={(m) => {
            setPayment(null);
            toast.error(m);
          }}
          onDismiss={() => {
            setPayment(null);
            toast.message("Payment cancelled. You can try again when you are ready.");
          }}
        />
      )}
      {payment?.mode === "dummy" && (
        <DummyRazorpayModal
          orderId={payment.razorpayOrderId}
          amount={payment.amount}
          email={payment.email}
          onSuccess={confirmPayment}
          onFailure={(m) => {
            setPayment(null);
            toast.error(m);
          }}
          onDismiss={() => {
            setPayment(null);
            toast.message("Payment cancelled. You can try again when you are ready.");
          }}
        />
      )}
      <form
        className="mx-auto grid max-w-6xl gap-10 px-4 pb-12 pt-28 sm:pt-32 lg:grid-cols-[1fr_340px]"
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
            // Hand over to the payment modal; the order is placed once it reports a verified payment
            setPayment({ razorpayOrderId: data.razorpayOrderId, amount: data.amount, email: f.email, name: f.name, phone: f.phone, keyId: data.keyId, mode: data.mode });
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
                <Input key={`${id}-${prefill[id] ? 1 : 0}`} id={id} name={id} type={type} required defaultValue={prefill[id] ?? ""} className="h-10" />
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
          <Button type="submit" size="lg" className="mt-6 h-11 w-full" disabled={busy}>{busy ? "Processing…" : "Pay & place order"}</Button>
        </aside>
      </form>
    </>
  );
}
