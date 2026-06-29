"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function TopLoader() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const t1 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t2 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t3 = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    [t1, t2, t3].forEach((t) => t.current && clearTimeout(t.current));

    setVisible(true);
    setWidth(0);

    // Snap to 20% instantly, then crawl to 85%
    requestAnimationFrame(() => {
      setWidth(20);
      t1.current = setTimeout(() => setWidth(55), 80);
      t2.current = setTimeout(() => setWidth(85), 250);
      // Complete
      t3.current = setTimeout(() => {
        setWidth(100);
        setTimeout(() => setVisible(false), 300);
      }, 500);
    });

    return () => {
      [t1, t2, t3].forEach((t) => t.current && clearTimeout(t.current));
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-[2px] pointer-events-none">
      <div
        className="h-full bg-blue-500 transition-all ease-out"
        style={{
          width: `${width}%`,
          transitionDuration: width === 100 ? "150ms" : width === 20 ? "0ms" : "300ms",
          boxShadow: "0 0 8px rgba(59,130,246,0.8)",
        }}
      />
    </div>
  );
}
