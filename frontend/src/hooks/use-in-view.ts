import { useState, useEffect, useRef } from "react";

export function useInView(options: IntersectionObserverInit = { rootMargin: "200px" }) {
  const [isInView, setIsInView] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const ref = useRef<any>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      const intersecting = entry.isIntersecting;
      setIsInView(intersecting);
      if (intersecting) {
        setHasEntered(true);
      }
    }, options);

    observer.observe(el);
    return () => observer.disconnect();
  }, [options.rootMargin, options.threshold]);

  return { ref, isInView, hasEntered };
}

export default useInView;
