"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { btn } from "@/components/admin/ui";
import { syncProductsToMedusa } from "./actions";

/** Creates the given shop products in Medusa; one button for a single product or for all that are missing */
export function SyncProductsButton({ slugs, label }: { slugs: string[]; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={btn.secondary}
      onClick={() =>
        start(async () => {
          const { synced, failed } = await syncProductsToMedusa(slugs);
          if (synced) toast.success(`Synced ${synced} product${synced === 1 ? "" : "s"} to Medusa`);
          for (const f of failed) toast.error(`${f.slug || "Sync"}: ${f.error}`);
        })
      }
    >
      <RefreshCw size={13} className={pending ? "animate-spin" : ""} /> {pending ? "Syncing..." : label}
    </button>
  );
}
