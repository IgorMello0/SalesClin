import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  icon?: React.ReactNode;
}

export const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  icon,
}: CustomSelectProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  /* close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`
          w-full h-11 flex items-center gap-3 px-4 rounded-xl border text-sm font-medium
          transition-all duration-200 cursor-pointer text-left
          ${open
            ? 'border-accent ring-2 ring-accent/20 bg-background'
            : 'border-border bg-background hover:border-accent/50 hover:bg-muted/30'
          }
          ${selected ? 'text-foreground' : 'text-muted-foreground'}
        `}
      >
        {icon && (
          <span className="text-muted-foreground flex-shrink-0">{icon}</span>
        )}
        <span className="flex-1 truncate">{selected ? selected.label : placeholder}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 text-muted-foreground"
        >
          <ChevronDown className="w-4 h-4" />
        </motion.span>
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="
              absolute left-0 right-0 z-50 mt-2
              bg-card border border-border rounded-2xl shadow-xl shadow-black/10
              overflow-hidden
            "
          >
            <div className="py-1.5 max-h-56 overflow-y-auto">
              {/* Placeholder option */}
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/60 transition-colors"
              >
                <span className="w-4" />
                {placeholder}
              </button>

              {/* Divider */}
              <div className="h-px bg-border mx-3 my-1" />

              {options.map((opt) => {
                const isSelected = value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onChange(opt.value); setOpen(false); }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                      ${isSelected
                        ? 'bg-primary/8 text-primary font-semibold'
                        : 'text-foreground hover:bg-muted/60'
                      }
                    `}
                  >
                    <span className="w-4 flex-shrink-0">
                      {isSelected && <Check className="w-3.5 h-3.5 text-secondary" />}
                    </span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
