"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type Address = {
  id: string;
  address_name: string | null;
  first_name: string | null;
  last_name: string | null;
  address_1: string | null;
  address_2: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  phone: string | null;
  is_default_shipping: boolean;
};

export type OrderItem = { id: string; title: string; product_title?: string | null; variant_title?: string | null; quantity: number; unit_price: number; thumbnail?: string | null };
export type Order = {
  id: string;
  display_id: number;
  status: string;
  fulfillment_status?: string;
  payment_status?: string;
  created_at: string;
  total: number;
  items: OrderItem[];
};

export type SavedDesign = { id: string; product: string; color: string; preview?: string; status: string; createdAt: string };

export type AccountCustomer = {
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company_name: string | null;
  created_at: string;
  gst: string;
  avatar: string;
  addresses: Address[];
};

export const ACCOUNT_EVENT = "cottson:account-updated";
// Lets the site header re-read the signed-in user (photo, name) after an edit
export const notifyAccountChanged = () => window.dispatchEvent(new Event(ACCOUNT_EVENT));

export const fullName = (c: { first_name: string | null; last_name: string | null }) =>
  [c.first_name, c.last_name].filter(Boolean).join(" ");

export function Avatar({ src, label, className }: { src?: string; label: string; className?: string }) {
  const [broken, setBroken] = useState<string | null>(null);
  return (
    <div className={cn("grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#DCEAF5] font-semibold uppercase text-[#113858]", className)}>
      {src && broken !== src ? <img src={src} alt="" onError={() => setBroken(src)} className="size-full object-cover" /> : label[0]}
    </div>
  );
}

export function Card({ title, subtitle, action, children, className }: { title?: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-[#113858]/[0.08] bg-white p-6 shadow-[0_8px_30px_rgba(17,56,88,0.06)] sm:p-7", className)}>
      {(title || action) && (
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[#0B2A45]">{title}</h2>}
            {subtitle && <p className="mt-1 text-[13.5px] text-[#5B7690]">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export const btnPrimary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#113858] px-6 text-[12px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#0B2A45] disabled:pointer-events-none disabled:opacity-60";
export const btnGhost =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#113858]/20 px-5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#113858] transition hover:bg-[#EAF1F7] disabled:pointer-events-none disabled:opacity-60";

// Resizes a picked image to a centred 192px square JPEG so it stays small enough to store on the profile
export async function imageToAvatar(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Choose a JPG, PNG or WebP image");
  if (file.size > 8_000_000) throw new Error("Image is larger than 8 MB");
  const bmp = await createImageBitmap(file);
  const size = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 192;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, (bmp.width - size) / 2, (bmp.height - size) / 2, size, size, 0, 0, 192, 192);
  return canvas.toDataURL("image/jpeg", 0.82);
}
