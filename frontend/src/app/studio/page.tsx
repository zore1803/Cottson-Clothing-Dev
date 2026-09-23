import type { Metadata } from "next";
import { Suspense } from "react";
import { StudioEditor } from "@/components/studio/studio-editor";

export const metadata: Metadata = { title: "Design Studio" };

export default function StudioPage() {
  return (
    <Suspense>
      <StudioEditor />
    </Suspense>
  );
}
