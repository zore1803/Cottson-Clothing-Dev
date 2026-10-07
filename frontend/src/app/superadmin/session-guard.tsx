"use client";

import { useEffect, useRef, useState } from "react";

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const admitted = useRef(false);
  const activated = useRef(false);
  useEffect(() => {
    if (!admitted.current && sessionStorage.getItem("cottson-admin-entry") !== "yes") {
      navigator.sendBeacon("/api/superadmin/logout");
      window.location.replace("/superadmin");
      return;
    }
    sessionStorage.removeItem("cottson-admin-entry");
    admitted.current = true;
    const frame = requestAnimationFrame(() => { activated.current = true; setVisible(true); });
    const leave = () => {
      if (container.current) container.current.style.display = "none";
      navigator.sendBeacon("/api/superadmin/logout");
    };
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.replace("/superadmin");
    };
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", restore);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", restore);
      if (activated.current) leave();
    };
  }, []);
  return <div ref={container} style={{ display: visible ? undefined : "none" }}>{children}</div>;
}
