"use client";

import { useTransition } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { btn } from "@/components/admin/ui";
import { removeProduct, restoreProduct } from "./actions";

export function RemoveProductButton({ slug, title }: { slug: string; title: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Remove ${title}`}
      title="Remove from the shop"
      className={btn.ghost}
      onClick={() => {
        if (!confirm(`Remove ${title} from the shop? Existing orders are not affected.`)) return;
        start(async () => {
          const { error } = await removeProduct(slug);
          if (error) toast.error(error);
          else toast.success(`Removed ${title}`);
        });
      }}
    >
      <Trash2 size={13} />
    </button>
  );
}

export function RestoreProductButton({ slug, title }: { slug: string; title: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={btn.secondary}
      onClick={() =>
        start(async () => {
          const { error } = await restoreProduct(slug);
          if (error) toast.error(error);
          else toast.success(`Restored ${title}`);
        })
      }
    >
      <RotateCcw size={13} /> Restore
    </button>
  );
}
