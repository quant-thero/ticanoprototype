import React, { useEffect, useRef, useState } from 'react';

/**
 * Wraps children and applies an entrance animation once the element
 * scrolls into view, only once (doesn't re-trigger on scroll back up),
 * keeping this to "tasteful", not distracting on re-scroll.
 */
export default function Reveal({ children, animation = 'animate-fade-up', delay = 0, className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={visible ? { animationDelay: `${delay}ms` } : { opacity: 0 }}>
      {visible && <div className={animation} style={{ animationDelay: `${delay}ms` }}>{children}</div>}
    </div>
  );
}

/** Animated counter, counts up from 0 once scrolled into view. Parses
 * a leading numeric portion out of the string (e.g. "500+" -> 500,
 * "P 45 Million" -> 45) and animates that, preserving the rest as
 * prefix/suffix text around it. */
export function AnimatedCounter({ value, durationMs = 1400 }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(null);

  const match = String(value).match(/^(\D*?)([\d,]+(?:\.\d+)?)(\D*)$/);
  const prefix = match?.[1] ?? '';
  const numeric = match ? parseFloat(match[2].replace(/,/g, '')) : null;
  const suffix = match?.[3] ?? '';

  useEffect(() => {
    const el = ref.current;
    if (!el || numeric === null) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        setDisplay(Math.round(numeric * eased));
        if (progress < 1) requestAnimationFrame(tick);
        else setDisplay(numeric);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [numeric, durationMs]);

  if (numeric === null) return <span ref={ref}>{value}</span>;
  const formatted = Number.isInteger(numeric) ? (display ?? 0).toLocaleString() : (display ?? 0).toFixed(1);
  return <span ref={ref}>{prefix}{formatted}{suffix}</span>;
}
