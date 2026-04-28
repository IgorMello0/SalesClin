import React, { createContext, useContext, useState, useEffect } from 'react';
import { professionalsApi, permissionsApi, usuariosApi } from '@/lib/api';

interface Professional {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  role?: string;
}

interface Permission {
  moduleCode: string;
  moduleName: string;
  hasAccess: boolean;
}

interface AuthContextType {
  professional: Professional | null;
  permissions: Permission[];
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  signup: (data: Omit<Professional, 'id'> & { password: string }) => Promise<{ success: boolean; error?: string }>;
  hasModuleAccess: (moduleCode: string) => boolean;
  isLoading: boolean;
  loadPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar permissões do usuário logado
  const loadPermissions = async () => {
    try {
      const response = await permissionsApi.getMyPermissions();
      if (response.success && response.data) {
        setPermissions(response.data);
        console.log('[Auth] Permissions loaded:', response.data);
      }
    } catch (error) {
      console.error('[Auth] Error loading permissions:', error);
    }
  };

  // Verificar se o usuário tem acesso a um módulo
  const hasModuleAccess = (moduleCode: string): boolean => {
    // Se não há permissões carregadas, assumir que não tem acesso
    if (permissions.length === 0) return false;
    
    const permission = permissions.find((p) => p.moduleCode === moduleCode);
    return permission?.hasAccess ?? false;
  };

  useEffect(() => {
    // Verificar sessão armazenada
    const savedProfessional = localStorage.getItem('professional');
    const savedToken = localStorage.getItem('token');
    
    if (savedProfessional && savedToken) {
      try {
        setProfessional(JSON.parse(savedProfessional));
        // Carregar permissões do usuário logado
        loadPermissions();
      } catch (error) {
        // Se houver erro ao parsear, limpar dados inválidos
        localStorage.removeItem('professional');
        localStorage.removeItem('token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    
    try {
      console.log('[Auth] Attempting login for:', email);
      
      // Tentar login como profissional primeiro
      let response = await professionalsApi.login(email, password);
      console.log('[Auth] Professional login response:', response);
      
      // Se falhar, tentar login como usuário
      if (!response.success) {
        console.log('[Auth] Professional login failed, trying user login...');
        response = await usuariosApi.login(email, password);
        console.log('[Auth] User login response:', response);
      }
      
      if (response.success && response.data) {
        const { token, professional: profData, user: userData } = response.data as any;
        
        if ((!profData && !userData) || !token) {
          console.error('[Auth] Missing data in response:', response);
          setIsLoading(false);
          return { 
            success: false, 
            error: 'Resposta inválida do servidor. Tente novamente.' 
          };
        }
        
        // Criar dados do usuário logado (pode ser profissional ou usuário)
        const data = profData || userData;
        const professionalData: Professional = {
          id: data.id.toString(),
          name: data.name,
          email: data.email,
          phone: data.phone || '',
          specialization: data.specialization || data.role || 'Usuário',
          role: profData ? 'profissional' : (data.role || 'usuario'),
        };
        
        setProfessional(professionalData);
        localStorage.setItem('professional', JSON.stringify(professionalData));
        localStorage.setItem('token', token);
        localStorage.setItem('userType', profData ? 'professional' : 'user');
        
        // Carregar permissões do usuário logado
        await loadPermissions();
        
        setIsLoading(false);
        console.log('[Auth] Login successful as', profData ? 'professional' : 'user');
        return { success: true };
      }
      
      console.error('[Auth] Login failed:', response.error);
      setIsLoading(false);
      return { 
        success: false, 
        error: response.error?.message || 'Email ou senha incorretos.' 
      };
    } catch (error) {
      console.error('[Auth] Login exception:', error);
      setIsLoading(false);
      return { 
        success: false, 
        error: 'Erro de conexão. Verifique se o servidor está rodando e tente novamente.' 
      };
    }
  };

  const signup = async (data: Omit<Professional, 'id'> & { password: string }): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    
    try {
      console.log('[Auth] Attempting signup for:', data.email);
      const response = await professionalsApi.signup({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        specialization: data.specialization
      });
      console.log('[Auth] Signup response:', response);
      
      if (response.success && response.data) {
        const { token, professional: profData } = response.data;
        
        if (!profData || !token) {
          console.error('[Auth] Missing data in response:', response);
          setIsLoading(false);
          return { 
            success: false, 
            error: 'Resposta inválida do servidor. Tente novamente.' 
          };
        }
        
        const professionalData: Professional = {
          id: profData.id.toString(),
          name: profData.name,
          email: profData.email,
          phone: profData.phone || '',
          specialization: profData.specialization || ''
        };
        
        setProfessional(professionalData);
        localStorage.setItem('professional', JSON.stringify(professionalData));
        localStorage.setItem('token', token);
        
        // Carregar permissões do usuário logado
        await loadPermissions();
        
        setIsLoading(false);
        console.log('[Auth] Signup successful');
        return { success: true };
      }
      
      console.error('[Auth] Signup failed:', response.error);
      setIsLoading(false);
      return { 
        success: false, 
        error: response.error?.message || 'Erro ao criar conta. Tente novamente mais tarde.' 
      };
    } catch (error) {
      console.error('[Auth] Signup exception:', error);
      setIsLoading(false);
      return { 
        success: false, 
        error: 'Erro de conexão. Verifique se o servidor está rodando e tente novamente.' 
      };
    }
  };

  const logout = () => {
    setProfessional(null);
    setPermissions([]);
    localStorage.removeItem('professional');
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
  };

  return (
    <AuthContext.Provider value={{
      professional,
      permissions,
      login,
      logout,
      signup,
      hasModuleAccess,
      isLoading,
      loadPermissions
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}