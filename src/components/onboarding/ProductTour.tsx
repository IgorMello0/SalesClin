import React, { useEffect, useState, useCallback } from 'react';
import { TourPopover } from './TourPopover';
import { useLayout } from '@/contexts/LayoutContext';
import type { TourStep } from '@/hooks/useSectionTour';

export const ProductTour = () => {
  const { layout } = useLayout();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  const steps: TourStep[] = [
    {
      id: null,
      title: '👋 Bem-vindo ao SalesClin!',
      description: 'Preparamos um tour rápido pelas principais áreas do seu CRM. Leva menos de 1 minuto!',
      position: 'center',
    },
    {
      id: '#tour-menu',
      title: '🗂 Menu de Navegação',
      description: 'Acesse Leads, Clientes, Agenda, Comercial e Metas — tudo a um clique de distância.',
      position: layout === 'side' ? 'right' : 'bottom',
    },
    {
      id: '#tour-dashboard-stats',
      title: '📊 Indicadores em Tempo Real',
      description: 'Faturamento, conversões e leads atualizados em tempo real para decisões rápidas.',
      position: 'bottom',
    },
    {
      id: '#tour-settings',
      title: '⚙️ Configurações',
      description: 'Gerencie equipe, altere layout e personalize o CRM do seu jeito.',
      position: layout === 'side' ? 'right' : 'bottom',
    },
  ];

  useEffect(() => {
    const startTour = () => {
      setTimeout(() => { setStep(0); setActive(true); }, 600);
    };
    window.addEventListener('crm:start-tour', startTour);

    if (localStorage.getItem('crm_needs_tour') === 'true') {
      localStorage.removeItem('crm_needs_tour');
      setTimeout(() => { setStep(0); setActive(true); }, 800);
    }

    return () => window.removeEventListener('crm:start-tour', startTour);
  }, []);

  const handleClose = useCallback(() => {
    setActive(false);
    document.querySelectorAll('.tour-highlight').forEach((e) => e.classList.remove('tour-highlight'));
  }, []);

  const handleNext = useCallback(() => {
    if (step < steps.length - 1) setStep((s) => s + 1);
    else handleClose();
  }, [step, steps.length, handleClose]);

  const handlePrev = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  return (
    <TourPopover
      active={active}
      step={step}
      steps={steps}
      onNext={handleNext}
      onPrev={handlePrev}
      onClose={handleClose}
    />
  );
};
