import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import type { TourStep } from '@/hooks/useSectionTour';

/* ─── Types ──────────────────────────────────────────────── */
type Position = 'center' | 'bottom' | 'right' | 'top' | 'left';

interface PosResult {
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  translateX?: string;
  translateY?: string;
}

/* ─── Position helper ────────────────────────────────────── */
function calcPos(el: HTMLElement | null, position: Position): PosResult {
  const W = 320;
  const GAP = 14;
  const VW = window.innerWidth;
  const VH = window.innerHeight;

  // No element OR explicitly centered
  if (!el || position === 'center') {
    return {
      top: `${Math.round(VH / 2)}px`,
      left: `${Math.round(VW / 2)}px`,
      translateX: '-50%',
      translateY: '-50%',
    };
  }

  const r = el.getBoundingClientRect();

  if (position === 'bottom') {
    return {
      top: `${Math.min(r.bottom + GAP, VH - 260)}px`,
      left: `${Math.min(Math.max(r.left, 8), VW - W - 8)}px`,
    };
  }
  if (position === 'right') {
    return {
      top: `${Math.min(r.top, VH - 260)}px`,
      left: `${Math.min(r.right + GAP, VW - W - 8)}px`,
    };
  }
  if (position === 'left') {
    return {
      top: `${Math.min(r.top, VH - 260)}px`,
      left: `${Math.max(r.left - W - GAP, 8)}px`,
    };
  }
  // top
  return {
    top: `${Math.max(r.top - 260 - GAP, 8)}px`,
    left: `${Math.min(Math.max(r.left, 8), VW - W - 8)}px`,
  };
}

/* ─── Props ──────────────────────────────────────────────── */
interface TourPopoverProps {
  active: boolean;
  step: number;
  steps: TourStep[];
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

/* ═══════════════════════════════════════════════════════════ */
export const TourPopover: React.FC<TourPopoverProps> = ({
  active, step, steps, onNext, onPrev, onClose,
}) => {
  const [pos, setPos] = useState<PosResult>({ top: 0, left: 0, translateX: '-50%', translateY: '-50%' });
  const [rect, setRect] = useState<DOMRect | null>(null);
  const current = steps[step];

  useEffect(() => {
    if (!active || !current) return;
    const el = current.id ? document.querySelector<HTMLElement>(current.id) : null;

    const update = () => {
      setPos(calcPos(el, current.position ?? 'center'));
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    };

    update();

    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    document.querySelectorAll('.tour-highlight').forEach((e) => e.classList.remove('tour-highlight'));
    if (el) el.classList.add('tour-highlight');

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [active, step, current]);

  if (!active || !current) return null;

  const { translateX = '0%', translateY = '0%', ...coords } = pos;

  const pad = 6;
  const clipPath = rect
    ? `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${rect.left - pad}px ${rect.top - pad}px, ${rect.right + pad}px ${rect.top - pad}px, ${rect.right + pad}px ${rect.bottom + pad}px, ${rect.left - pad}px ${rect.bottom + pad}px, ${rect.left - pad}px ${rect.top - pad}px)`
    : undefined;

  const popover = (
    <>
      {/* Backdrop — rendered in body, escapes all transform contexts */}
      <div
        style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 9999, 
          backdropFilter: 'blur(3px)', 
          background: 'rgba(15, 23, 42, 0.45)',
          clipPath
        }}
        onClick={onClose}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.95, x: translateX, y: translateY }}
          animate={{ opacity: 1, scale: 1, x: translateX, y: translateY }}
          exit={{ opacity: 0, scale: 0.92, x: translateX, y: translateY }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            width: 320,
            zIndex: 10000,
            ...coords,
          }}
          className="bg-card rounded-2xl shadow-2xl shadow-black/20 ring-1 ring-border overflow-hidden"
        >
          {/* Orange accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-secondary to-orange-400" />

          <div className="p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-bold text-base text-foreground font-headline leading-tight">
                {current.title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Fechar tour"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              {current.description}
            </p>

            {/* Progress + Buttons */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 flex-1">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === step ? 'w-5 bg-secondary' : i < step ? 'w-3 bg-secondary/40' : 'w-3 bg-border'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={onPrev}
                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onNext}
                  className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover transition-colors shadow-sm shadow-primary/20"
                >
                  {step === steps.length - 1 ? (
                    <><CheckCircle2 className="w-3.5 h-3.5" /> Concluir</>
                  ) : (
                    <>Próximo <ChevronRight className="w-3.5 h-3.5" /></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Highlight style */}
      <style>{`
        .tour-highlight {
          position: relative;
          z-index: 10001 !important;
          border-radius: 8px;
          box-shadow: 0 0 0 3px hsl(25 95% 53%) !important;
          transition: box-shadow 0.3s ease;
        }
      `}</style>
    </>
  );

  // Portal to document.body escapes ALL transform/overflow contexts in the React tree
  return createPortal(popover, document.body);
};
