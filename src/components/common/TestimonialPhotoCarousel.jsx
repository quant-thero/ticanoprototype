import React, { useState, useEffect, useRef } from 'react';
import { Expand, X } from 'lucide-react';

// Moved out of LandingPage.jsx and made a standalone, reusable component
// when the photo Testimonials section moved from the homepage to the
// dedicated Our Journey page, same drag/pause carousel with a dedicated
// expand button per photo (not tap-detection, which proved unreliable on
// a draggable strip) and a click-to-enlarge lightbox with a close button.
export default function TestimonialPhotoCarousel({ photos }) {
  const [offset, setOffset] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lightbox, setLightbox] = useState(null); // the photo currently enlarged, or null
  const [zoomed, setZoomed] = useState(false); // double-click toggles a closer zoom while the lightbox is open
  const cardW = 260 + 16;
  const max = photos.length * cardW;
  const dragRef = useRef(null);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => setOffset(prev => (prev + 1) % max), 30);
    return () => clearInterval(interval);
  }, [photos.length, paused, max]);

  const onPointerDown = (e) => {
    setPaused(true);
    dragRef.current = { startX: e.clientX, startOffset: offset };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const delta = dragRef.current.startX - e.clientX;
    setOffset((dragRef.current.startOffset + delta + max) % max);
  };
  const endDrag = () => { dragRef.current = null; setPaused(false); };

  const doubled = [...photos, ...photos];
  return (
    <>
    <div
      className="overflow-hidden relative cursor-grab active:cursor-grabbing select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => { setPaused(false); endDrag(); }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className="flex gap-4 transition-none" style={{ transform: `translateX(-${offset}px)`, width: `${doubled.length * cardW}px` }}>
        {doubled.map((p, i) => {
          const hasText = p.name || p.roleLabel || p.caption;
          return (
          <div key={i} className="flex-shrink-0 w-64 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-md relative">
            <img src={p.imageUrl} alt={p.name || 'Ticano testimonial'} className={`w-full object-cover pointer-events-none ${hasText ? 'h-64' : 'h-80'}`} draggable={false} />
            {/* Dedicated expand button, a discrete target with its own
                isolated handlers is far more reliable than trying to tell
                a tap apart from the start of a drag on a draggable strip.
                Stops propagation at both the pointer and click level so
                the carousel's own drag handlers never see this press. */}
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); setZoomed(false); setLightbox(p); }}
              aria-label="Enlarge photo"
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
            >
              <Expand size={14} />
            </button>
            {hasText && (
              <div className="p-4 pointer-events-none">
                {p.name && <p className="font-bold text-sm text-ticano-charcoal dark:text-white">{p.name}</p>}
                {p.roleLabel && <p className="text-xs text-ticano-red font-medium mt-0.5">{p.roleLabel}</p>}
                {p.caption && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed italic">"{p.caption}"</p>}
              </div>
            )}
          </div>
          );
        })}
      </div>
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-gray-50 dark:from-gray-800 to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-gray-50 dark:from-gray-800 to-transparent pointer-events-none" />
    </div>

    {lightbox && (
      <div
        className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        onClick={() => { setLightbox(null); setZoomed(false); }}
      >
        <button
          onClick={() => { setLightbox(null); setZoomed(false); }}
          aria-label="Close"
          className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
        >
          <X size={22} />
        </button>
        <div className={`max-w-3xl max-h-[85vh] w-full flex flex-col items-center ${zoomed ? 'overflow-auto' : ''}`} onClick={(e) => e.stopPropagation()}>
          <img
            src={lightbox.imageUrl}
            alt={lightbox.name || 'Ticano testimonial'}
            onDoubleClick={() => setZoomed((z) => !z)}
            title="Double-click to zoom"
            className={`rounded-xl shadow-2xl transition-transform duration-300 select-none ${
              zoomed ? 'max-w-none w-auto h-auto scale-150 cursor-zoom-out' : 'max-w-full max-h-[70vh] object-contain cursor-zoom-in'
            }`}
          />
          {!zoomed && (lightbox.name || lightbox.roleLabel || lightbox.caption) && (
            <div className="mt-4 text-center px-4">
              {lightbox.name && <p className="font-bold text-white text-lg">{lightbox.name}</p>}
              {lightbox.roleLabel && <p className="text-ticano-red font-medium text-sm mt-0.5">{lightbox.roleLabel}</p>}
              {lightbox.caption && <p className="text-gray-300 text-sm mt-2 italic max-w-lg">"{lightbox.caption}"</p>}
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}
