"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { btn } from "@/components/admin/ui";
import { deleteProduct } from "./actions";

// Only products added from this screen can be deleted; the built-in catalogue lives in code
export function DeleteProductButton({ slug, title }: { slug: string; title: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Delete ${title}`}
      className={btn.ghost}
      onClick={() => {
        if (!confirm(`Delete ${title}? It will disappear from the shop.`)) return;
        start(async () => {
          const { error } = await deleteProduct(slug);
          if (error) toast.error(error);
          else toast.success(`Deleted ${title}`);
        });
      }}
    >
      <Trash2 size={13} />
    </button>
  );
}
