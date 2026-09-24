"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Slim red bar tied to real Next.js route transitions: starts on any
 * internal link click or back/forward nav, and completes once the App
 * Router has actually finished rendering the new route (pathname/search
 * params change). Not a fake fixed-duration timer. */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = `${pathname}?${searchParams.toString()}`;
  const prevKey = useRef(key);

  const start = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (trickleRef.current) clearInterval(trickleRef.current);
    setVisible(true);
    setProgress(8);
    // Trickle toward 90% while we wait for the real navigation to land —
    // slows down the closer it gets, so it never looks "stuck at 100%".
    trickleRef.current = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + (90 - p) / 12));
    }, 200);
  };

  const finish = () => {
    if (trickleRef.current) clearInterval(trickleRef.current);
    setProgress(100);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 250);
  };

  // A route actually finished rendering once the pathname/search-params key changes
  useEffect(() => {
    if (prevKey.current !== key) {
      prevKey.current = key;
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement)?.closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      const target = a.getAttribute("target");
      if (!href || href.startsWith("#") || target === "_blank" || a.hasAttribute("download")) return;
      if (href.startsWith("http") && !href.startsWith(window.location.origin)) return;
      if (href === window.location.pathname + window.location.search) return;
      start();
    };
    const onPopState = () => start();

    document.addEventListener("click", onClick);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPopState);
      if (trickleRef.current) clearInterval(trickleRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] bg-transparent">
      <div
        className="h-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.6)] transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
