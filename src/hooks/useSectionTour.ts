import { useState, useEffect, useCallback, useRef } from 'react';

export interface TourStep {
  id?: string | null;        // CSS selector do elemento alvo (null = modal centrado)
  title: string;
  description: string;
  position?: 'center' | 'bottom' | 'right' | 'top' | 'left';
}

/**
 * Hook que gerencia o tour de primeira visita de uma página.
 * @param pageKey  - Chave única da página (ex: 'clients', 'goals')
 * @param steps    - Lista de passos do tour
 * @param delay    - Delay em ms antes de iniciar (default 600ms)
 */
export function useSectionTour(
  pageKey: string,
  steps: TourStep[],
  delay = 700
) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const started = useRef(false);

  const storageKey = `crm_tour_seen_${pageKey}`;

  useEffect(() => {
    if (started.current) return;
    if (localStorage.getItem(storageKey) === 'true') return;
    started.current = true;

    const t = setTimeout(() => {
      setStep(0);
      setActive(true);
    }, delay);

    return () => clearTimeout(t);
  }, [storageKey, delay]);

  const handleNext = useCallback(() => {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleClose();
    }
  }, [step, steps.length]);

  const handlePrev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const handleClose = useCallback(() => {
    localStorage.setItem(storageKey, 'true');
    setActive(false);
    document.querySelectorAll('.tour-highlight').forEach((e) =>
      e.classList.remove('tour-highlight')
    );
  }, [storageKey]);

  return {
    tourActive: active,
    tourStep: step,
    tourSteps: steps,
    tourHandleNext: handleNext,
    tourHandlePrev: handlePrev,
    tourHandleClose: handleClose,
  };
}
