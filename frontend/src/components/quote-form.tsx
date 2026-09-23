"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PRODUCTS } from "@/lib/catalog";
import { Button } from "@/components/ui/button";

const field = "h-10 w-full rounded-md border border-background/20 bg-background/10 px-3 text-sm placeholder:text-background/60 outline-none focus:border-background/60";

/** Bulk-order quote request, stored in MongoDB */
export function QuoteForm() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (sent) return <p className="rounded-xl bg-background/10 p-6">Thanks! Our team will send your quote within one working day.</p>;

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const res = await fetch("/api/quotes", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
        });
        setBusy(false);
        if (res.ok) setSent(true);
        else toast.error("Could not send your request, please try again");
      }}
    >
      <input name="name" required placeholder="Your name" className={field} />
      <input name="company" placeholder="Company" className={field} />
      <input name="email" type="email" required placeholder="Email" className={field} />
      <input name="phone" type="tel" placeholder="Phone" className={field} />
      <select name="product" className={field} defaultValue={PRODUCTS[0].slug}>
        {PRODUCTS.map((p) => (
          <option key={p.slug} value={p.slug} className="text-foreground">{p.title}</option>
        ))}
      </select>
      <input name="quantity" type="number" min={25} placeholder="Quantity (25+)" className={field} />
      <textarea name="message" rows={3} placeholder="Colors, logo placement, deadline…" className={`${field} h-auto py-2 sm:col-span-2`} />
      <Button type="submit" variant="secondary" size="lg" className="h-11 sm:col-span-2" disabled={busy}>
        {busy ? "Sending…" : "Get a bulk quote"}
      </Button>
    </form>
  );
}
