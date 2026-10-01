"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Field, FormError, SubmitButton, send } from "@/components/auth/fields";
import { Avatar, Card, btnGhost, notifyAccountChanged, type AccountCustomer } from "./shared";

export function ProfileSection({
  customer,
  onPickPhoto,
  onRemovePhoto,
  photoBusy,
}: {
  customer: AccountCustomer;
  onPickPhoto: () => void;
  onRemovePhoto: () => void;
  photoBusy: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");
    try {
      await send("/api/auth/me", { firstName: f.firstName, lastName: f.lastName, phone: f.phone, company: f.company, gst: f.gst }, "PATCH");
      toast.success("Profile updated");
      notifyAccountChanged();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <Card title="Profile photo" subtitle="Shown on your account and in the site header.">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar src={customer.avatar} label={customer.first_name || customer.email} className="size-20 text-3xl" />
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onPickPhoto} disabled={photoBusy} className={btnGhost}>
              <Camera size={15} /> {customer.avatar ? "Change photo" : "Upload photo"}
            </button>
            {customer.avatar && (
              <button type="button" onClick={onRemovePhoto} disabled={photoBusy} className={btnGhost}>
                <Trash2 size={15} /> Remove
              </button>
            )}
          </div>
          <p className="w-full text-[12.5px] text-[#5B7690]">JPG, PNG or WebP. Square photos work best.</p>
        </div>
      </Card>

      <form method="post" onSubmit={save}>
        <Card title="Personal & business details" subtitle="Used to pre-fill checkout and your GST invoices.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="firstName" label="First name" required defaultValue={customer.first_name ?? ""} autoComplete="given-name" />
            <Field id="lastName" label="Last name" defaultValue={customer.last_name ?? ""} autoComplete="family-name" />
            <Field id="email" label="Email" type="email" value={customer.email} readOnly disabled />
            <Field id="phone" label="Phone" type="tel" defaultValue={customer.phone ?? ""} autoComplete="tel" placeholder="+91 00000 00000" />
            <Field id="company" label="Company name" defaultValue={customer.company_name ?? ""} autoComplete="organization" placeholder="Your company" />
            <Field id="gst" label="GST number" defaultValue={customer.gst} maxLength={15} placeholder="15-character GSTIN" />
          </div>
          <div className="mt-5 space-y-5">
            <FormError message={error} />
            <div className="sm:max-w-[220px]">
              <SubmitButton busy={busy}>Save changes</SubmitButton>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
