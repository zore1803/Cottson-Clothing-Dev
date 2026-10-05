"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Field, FormError, SubmitButton, send } from "@/components/auth/fields";
import { Card, btnGhost, btnPrimary, type Address } from "./shared";

const nameOf = (a: Address) => [a.first_name, a.last_name !== "-" && a.last_name].filter(Boolean).join(" ");

function AddressForm({ address, onDone }: { address?: Address; onDone: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = { ...Object.fromEntries(fd), is_default_shipping: fd.get("is_default_shipping") === "on" };
    setBusy(true);
    setError("");
    try {
      await send(address ? `/api/account/addresses/${address.id}` : "/api/account/addresses", body);
      toast.success(address ? "Address updated" : "Address added");
      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  return (
    <form method="post" onSubmit={submit} className="rounded-2xl bg-[#F3F7FB] p-5 sm:p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="address_name" label="Label" defaultValue={address?.address_name ?? ""} placeholder="Office, Warehouse" className="sm:col-span-2" />
        <Field id="first_name" label="First name" required defaultValue={address?.first_name ?? ""} />
        <Field id="last_name" label="Last name" defaultValue={address?.last_name === "-" ? "" : (address?.last_name ?? "")} />
        <Field id="address_1" label="Address" required defaultValue={address?.address_1 ?? ""} className="sm:col-span-2" />
        <Field id="address_2" label="Apartment, suite, landmark" defaultValue={address?.address_2 ?? ""} className="sm:col-span-2" />
        <Field id="city" label="City" required defaultValue={address?.city ?? ""} />
        <Field id="province" label="State" defaultValue={address?.province ?? ""} placeholder="Maharashtra" />
        <Field id="postal_code" label="PIN code" required inputMode="numeric" maxLength={6} defaultValue={address?.postal_code ?? ""} />
        <Field id="phone" label="Phone" type="tel" defaultValue={address?.phone ?? ""} />
      </div>
      <label className="mt-5 flex cursor-pointer items-center gap-3 text-[14px] font-medium text-[#113858]">
        <input type="checkbox" name="is_default_shipping" defaultChecked={address?.is_default_shipping} className="size-4 accent-[#113858]" />
        Use as my default delivery address
      </label>
      <div className="mt-5 space-y-4">
        <FormError message={error} />
        <div className="flex flex-wrap gap-3">
          <div className="min-w-[180px]">
            <SubmitButton busy={busy}>{address ? "Save address" : "Add address"}</SubmitButton>
          </div>
          <button type="button" onClick={onDone} className={btnGhost}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

export function AddressesSection({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);

  async function remove(id: string) {
    if (!confirm("Delete this address?")) return;
    try {
      await send(`/api/account/addresses/${id}`, {}, "DELETE");
      toast.success("Address deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Card
      title="Saved addresses"
      subtitle="Delivery addresses used to pre-fill checkout."
      action={
        editing !== "new" && (
          <button type="button" onClick={() => setEditing("new")} className={btnPrimary}>
            <Plus size={15} /> Add
          </button>
        )
      }
    >
      <div className="space-y-4">
        {editing === "new" && <AddressForm onDone={() => setEditing(null)} />}
        {!addresses.length && editing !== "new" && (
          <div className="grid place-items-center rounded-2xl border border-dashed border-[#113858]/20 px-6 py-12 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-[#DCEAF5] text-[#113858]">
              <MapPin size={22} />
            </span>
            <p className="mt-4 text-[15px] font-semibold text-[#0B2A45]">No saved addresses yet</p>
            <p className="mt-1 text-[13.5px] text-[#5B7690]">Add one to check out faster.</p>
          </div>
        )}
        {addresses.map((a) =>
          editing === a.id ? (
            <AddressForm key={a.id} address={a} onDone={() => setEditing(null)} />
          ) : (
            <div key={a.id} className="flex items-start justify-between gap-4 rounded-2xl border border-[#113858]/10 p-5">
              <div className="min-w-0 text-[14px] leading-relaxed text-[#35516B]">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[#0B2A45]">{a.address_name || nameOf(a)}</span>
                  {a.is_default_shipping && (
                    <span className="rounded-full bg-[#DCEAF5] px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#1F5A8C]">Default</span>
                  )}
                </div>
                {a.address_name && <p>{nameOf(a)}</p>}
                <p>{[a.address_1, a.address_2].filter(Boolean).join(", ")}</p>
                <p>{[a.city, a.province, a.postal_code].filter(Boolean).join(", ")}</p>
                {a.phone && <p className="text-[#5B7690]">{a.phone}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" aria-label="Edit address" onClick={() => setEditing(a.id)} className="grid size-9 place-items-center rounded-full text-[#113858] transition hover:bg-[#EAF1F7]">
                  <Pencil size={16} />
                </button>
                <button type="button" aria-label="Delete address" onClick={() => remove(a.id)} className="grid size-9 place-items-center rounded-full text-[#a32f52] transition hover:bg-[#c8426b]/10">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </Card>
  );
}
