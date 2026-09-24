import Link from "next/link";
import { ImageIcon } from "lucide-react";

export function DesignShowcase() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-20">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">Design Before Production</h2>
          <p className="mt-5 max-w-md text-muted-foreground">
            Use our Custom Design Studio to visualise your corporate t-shirts and uniforms before production begins.
            Create, review and refine your designs, check logo placement and colours, and get clarity before moving
            to sampling and manufacturing.
          </p>
          <p className="mt-4 max-w-md text-muted-foreground">
            This reduces errors, speeds up approvals and ensures your final product matches your expectations.
          </p>
          <Link
            href="/studio"
            className="mt-8 inline-flex h-11 items-center rounded-full bg-brand px-7 text-sm font-semibold text-white shadow-sm hover:bg-brand/90"
          >
            Get Design
          </Link>
        </div>

        {/* Phone mockup + garment photo (added later) */}
        <div className="flex items-center justify-center gap-4">
          <div className="grid aspect-[9/19] w-40 shrink-0 place-items-center rounded-[2rem] border-2 border-dashed bg-muted text-muted-foreground sm:w-48">
            <ImageIcon className="size-6" strokeWidth={1.5} />
          </div>
          <div className="grid aspect-[3/4] w-40 shrink-0 place-items-center rounded-2xl border-2 border-dashed bg-muted text-muted-foreground sm:w-52">
            <ImageIcon className="size-6" strokeWidth={1.5} />
          </div>
        </div>
      </div>
    </section>
  );
}
