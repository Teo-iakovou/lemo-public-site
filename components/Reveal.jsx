"use client";

import { useEffect, useRef, useState } from "react";

export default function Reveal({
  as: Tag = "div",
  children,
  className = "",
  delay = 0,
  // Toggle visibility on scroll both entering and leaving by default
  once = false,
  threshold = 0.15,
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [once, threshold]);

  return (
    <Tag
      ref={ref}
      className={`transition-all duration-1000 ease-out will-change-transform ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
