import React, { createContext, useContext, useEffect, useState } from 'react';

type LayoutStyle = 'top' | 'side';

interface LayoutContextType {
  layout: LayoutStyle;
  setLayout: (layout: LayoutStyle) => void;
  toggleLayout: () => void;
  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};

interface LayoutProviderProps {
  children: React.ReactNode;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  const [layout, setLayoutState] = useState<LayoutStyle>(() => {
    const saved = localStorage.getItem('crm_layout_preference');
    return (saved === 'top' || saved === 'side') ? saved : 'top'; // Default is top
  });

  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsedState] = useState(() => {
    const saved = localStorage.getItem('crm_sidebar_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('crm_layout_preference', layout);
  }, [layout]);

  useEffect(() => {
    localStorage.setItem('crm_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const setLayout = (newLayout: LayoutStyle) => {
    setLayoutState(newLayout);
  };

  const toggleLayout = () => {
    setLayoutState(prev => prev === 'top' ? 'side' : 'top');
  };

  const setSidebarCollapsed = (collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
  };

  return (
    <LayoutContext.Provider value={{ 
      layout, 
      setLayout, 
      toggleLayout, 
      isMobileSidebarOpen, 
      setMobileSidebarOpen,
      isSidebarCollapsed,
      setSidebarCollapsed
    }}>
      {children}
    </LayoutContext.Provider>
  );
};
