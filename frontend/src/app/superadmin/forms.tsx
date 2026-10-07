"use client";

import { useActionState, useEffect, useState } from "react";
import Image from "next/image";
import { COLORS, colorById, type Product } from "@/lib/catalog";
import { GarmentPhoto } from "@/components/design-studio/garment-photo";
import { ColorSwatches } from "@/components/color-swatches";
import { addProduct, login } from "./actions";

const field = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#113858]";
const button = "rounded-xl bg-[#113858] px-6 py-3 font-medium text-white disabled:opacity-50";

function isPreviewUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "ik.imagekit.io" && url.pathname.startsWith("/qiap0iq38/") && !url.username && !url.password && !url.port;
  } catch { return false; }
}

export function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: "" });
  useEffect(() => {
    if (!state.authenticated) return;
    sessionStorage.setItem("cottson-admin-entry", "yes");
    window.location.replace("/superadmin/panel");
  }, [state.authenticated]);
  return <form action={action} className="space-y-6"><label className="block">Superadmin password<input name="password" type="password" autoComplete="current-password" required className={field} /></label>{state.error && <p role="alert" className="text-red-700">{state.error}</p>}<button disabled={pending} className={button}>{pending ? "Signing in…" : "Sign in"}</button></form>;
}

export function ProductForm() {
  const [state, action, pending] = useActionState(addProduct, { error: "", success: "" });
  const [colors, setColors] = useState(["black"]);
  const [originalColor, setOriginalColor] = useState("black");
  const [images, setImages] = useState<Record<string, string>>({});
  const [previewColor, setPreviewColor] = useState("black");
  const previewColors = colors.filter((id) => isPreviewUrl(images[id] ?? ""));
  const activePreviewColor = previewColors.includes(previewColor) ? previewColor : previewColors[0];
  const previewProduct: Product = {
    slug: "superadmin-preview", title: "Product preview", category: "", description: "",
    price: 0, currency: "INR", sizes: [], minBulk: 1,
    originalColor: activePreviewColor ?? "black", colors: previewColors,
    colorImages: Object.fromEntries(previewColors.map((id) => [id, images[id].trim()])),
  };
  const toggleColor = (id: string) => {
    const next = colors.includes(id) ? colors.filter((c) => c !== id) : [...colors, id];
    setColors(next);
    if (!next.includes(originalColor)) setOriginalColor(next[0] ?? "");
  };
  return <form action={action} className="space-y-6">
    <div className="grid gap-5 sm:grid-cols-2">
      <label>Product name<input name="title" required maxLength={150} placeholder="Classic Cotton Shirt" className={field} /></label>
      <label>URL slug<input name="slug" required maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="classic-cotton-shirt" className={field} /></label>
      <label>Category<input name="category" required maxLength={60} list="categories" placeholder="Shirts" className={field} /><datalist id="categories">{["Polos", "Shirts", "T-Shirts", "Jacket", "Hoodies", "Sweatshirt", "Towels", "Cap", "Trousers"].map((c) => <option key={c} value={c} />)}</datalist></label>
      <label>Price (INR)<input name="price" type="number" required min="0" step="0.01" className={field} /></label>
      <label>Sizes (comma separated)<input name="sizes" required defaultValue="S, M, L, XL, XXL" className={field} /></label>
      <label>Default colour<select name="originalColor" required value={originalColor} onChange={(e) => setOriginalColor(e.target.value)} className={field}>{!colors.length && <option value="">Select an available colour first</option>}{COLORS.filter((c) => colors.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Minimum order quantity<input name="minBulk" type="number" min="1" step="1" required defaultValue="25" className={field} /></label>
      <label>Production days<input name="productionDays" type="number" min="1" step="1" required defaultValue="28" className={field} /></label>
    </div>
    <label className="block">Description<textarea name="description" required maxLength={5000} rows={4} className={field} /></label>
    <fieldset className="space-y-4"><legend className="text-lg font-semibold">Available colours & photos</legend><p className="text-sm text-slate-500">Select every colour you sell and provide its matching ImageKit photo. Use the same pose, background, image dimensions and garment position for every colour so only the garment colour changes in the preview.</p>
      <div className="flex flex-wrap gap-2">{COLORS.map((c) => <label key={c.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${colors.includes(c.id) ? "border-[#113858] bg-blue-50" : "bg-white"}`}><input type="checkbox" name="colors" value={c.id} checked={colors.includes(c.id)} onChange={() => toggleColor(c.id)} /><span className="size-4 rounded-full border" style={{ backgroundColor: c.hex }} />{c.name}</label>)}</div>
      {!colors.length && <p className="text-red-700">Select at least one colour.</p>}
      {activePreviewColor && <section className="rounded-2xl border bg-white p-4 sm:p-6" aria-label="Live colour preview">
        <h3 className="font-semibold">Live preview: {colorById(activePreviewColor).name}</h3>
        <p className="mt-1 text-sm text-slate-500">Choose a swatch to preview its photo with the same colour sweep used on the product page.</p>
        <div className="relative mx-auto mt-4 aspect-[2/3] w-full max-w-sm overflow-hidden rounded-2xl bg-slate-50"><GarmentPhoto product={previewProduct} colorId={activePreviewColor} /></div>
        <div className="mt-4"><ColorSwatches colorIds={previewColors} value={activePreviewColor} onChange={setPreviewColor} /></div>
      </section>}
      <div className="grid gap-4 sm:grid-cols-2">{colors.map((id) => {
        const color = COLORS.find((c) => c.id === id)!;
        const preview = isPreviewUrl(images[id] ?? "");
        return <div key={id} className="rounded-2xl border bg-white p-4"><label className="block font-medium">{color.name} photo URL<input name={`image-${id}`} type="url" required maxLength={2048} value={images[id] ?? ""} onChange={(e) => setImages((current) => ({ ...current, [id]: e.target.value }))} placeholder="https://ik.imagekit.io/qiap0iq38/…" className={field} /></label>{preview && <div className="relative mt-3 aspect-[3/4] overflow-hidden rounded-xl bg-slate-50"><Image src={images[id]} alt={`${color.name} preview`} fill unoptimized className="object-cover" /></div>}</div>;
      })}</div>
    </fieldset>
    <fieldset><legend className="mb-3 font-semibold">Product features</legend><div className="flex flex-wrap gap-4">{[["customColor", "Custom colours"], ["printOnDemand", "Print on demand"], ["express", "Express production"], ["promo", "Promotional product"]].map(([key, title]) => <label key={key} className="flex items-center gap-2 text-sm"><input name={key} type="checkbox" />{title}</label>)}</div></fieldset>
    {state.error && <p role="alert" className="text-red-700">{state.error}</p>}
    {state.success && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">{state.success}</p>}
    <button disabled={pending} className={button}>{pending ? "Saving product…" : "Add product"}</button>
  </form>;
}
