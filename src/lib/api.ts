const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: number
  }
  pagination?: {
    page: number
    pageSize: number
    total: number
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`
  const token = localStorage.getItem('token')

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  try {
    console.log('[API] Request:', { url, method: options.method || 'GET', body: options.body })
    
    const response = await fetch(url, {
      ...options,
      headers,
    })

    console.log('[API] Response:', { status: response.status, statusText: response.statusText, url })

    let data
    const contentType = response.headers.get('content-type')
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      const text = await response.text()
      data = text ? { message: text } : { message: 'Erro na requisição' }
    }
    
    console.log('[API] Response data:', data)
    
    if (!response.ok) {
      // Se for erro de autenticação (401), limpar token e redirecionar para login
      if (response.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('professional')
        // Redirecionar para login apenas se não estiver já na página de login
        if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
          window.location.href = '/login'
        }
      }
      
      return {
        success: false,
        error: data.error || { message: data.message || 'Erro na requisição', code: response.status },
      }
    }

    return data
  } catch (error) {
    console.error('[API] Error:', error)
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Erro de conexão. Verifique se o servidor está rodando.',
        code: 0,
      },
    }
  }
}

// Clientes
export const clientsApi = {
  getAll: async (params?: { page?: number; pageSize?: number; search?: string }) => {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', params.page.toString())
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString())
    if (params?.search) query.append('search', params.search)
    
    return apiRequest<Array<any>>(`/clientes?${query.toString()}`)
  },
  getById: async (id: number) => apiRequest<any>(`/clientes/${id}`),
  create: async (data: any) => apiRequest<any>('/clientes', { method: 'POST', body: JSON.stringify(data) }),
  update: async (id: number, data: any) => apiRequest<any>(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: async (id: number) => apiRequest<{ id: number }>(`/clientes/${id}`, { method: 'DELETE' }),
}

// Dashboard
export const dashboardApi = {
  getMetrics: async (filter: string = 'custom') => 
    apiRequest<any>(`/dashboard/metrics?filter=${filter}`),
}

// Profissionais
export const professionalsApi = {
  login: async (email: string, password: string) => 
    apiRequest<{ token: string; professional: any }>('/profissionais/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signup: async (data: { name: string; email: string; password: string; phone?: string; specialization?: string }) => 
    apiRequest<{ token: string; professional: any }>('/profissionais', { method: 'POST', body: JSON.stringify(data) }),
  getMe: async () => apiRequest<any>('/profissionais/me'),
  updateMe: async (data: any) => apiRequest<any>('/profissionais/me', { method: 'PUT', body: JSON.stringify(data) }),
  getAll: async (params?: { page?: number; pageSize?: number; search?: string }) => {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', params.page.toString())
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString())
    if (params?.search) query.append('search', params.search)
    
    return apiRequest<Array<any>>(`/profissionais?${query.toString()}`)
  },
  getById: async (id: number) => apiRequest<any>(`/profissionais/${id}`),
  getClients: async (id: number, params?: { page?: number; pageSize?: number }) => {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', params.page.toString())
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString())
    
    return apiRequest<Array<any>>(`/profissionais/${id}/clientes?${query.toString()}`)
  },
  create: async (data: any) => apiRequest<any>('/profissionais', { method: 'POST', body: JSON.stringify(data) }),
  addTeamMember: async (data: any) => apiRequest<any>('/profissionais/equipe', { method: 'POST', body: JSON.stringify(data) }),
  update: async (id: number, data: any) => apiRequest<any>(`/profissionais/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: async (id: number) => apiRequest<{ id: number }>(`/profissionais/${id}`, { method: 'DELETE' }),
}

// Categorias
export const categoriesApi = {
  getAll: async (params?: { page?: number; pageSize?: number; search?: string }) => {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', params.page.toString())
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString())
    if (params?.search) query.append('search', params.search)
    
    return apiRequest<Array<any>>(`/categorias?${query.toString()}`)
  },
  getById: async (id: number) => apiRequest<any>(`/categorias/${id}`),
  create: async (data: any) => apiRequest<any>('/categorias', { method: 'POST', body: JSON.stringify(data) }),
  update: async (id: number, data: any) => apiRequest<any>(`/categorias/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: async (id: number) => apiRequest<{ id: number }>(`/categorias/${id}`, { method: 'DELETE' }),
}

// Usuários
export const usuariosApi = {
  getAll: async (params?: { page?: number; pageSize?: number; search?: string }) => {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', params.page.toString())
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString())
    if (params?.search) query.append('search', params.search)
    
    return apiRequest<Array<any>>(`/usuarios?${query.toString()}`)
  },
  getById: async (id: number) => apiRequest<any>(`/usuarios/${id}`),
  login: async (email: string, password: string) => 
    apiRequest<{ token: string }>('/usuarios/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  create: async (data: any) => apiRequest<any>('/usuarios', { method: 'POST', body: JSON.stringify(data) }),
  update: async (id: number, data: any) => apiRequest<any>(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: async (id: number) => apiRequest<{ id: number }>(`/usuarios/${id}`, { method: 'DELETE' }),
}

// Agendamentos
export const appointmentsApi = {
  getAll: async (params?: { page?: number; pageSize?: number; professionalId?: number; clientId?: number; status?: string }) => {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', params.page.toString())
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString())
    if (params?.professionalId) query.append('professionalId', params.professionalId.toString())
    if (params?.clientId) query.append('clientId', params.clientId.toString())
    if (params?.status) query.append('status', params.status)
    
    return apiRequest<Array<any>>(`/agendamentos?${query.toString()}`)
  },
  getById: async (id: number) => apiRequest<any>(`/agendamentos/${id}`),
  create: async (data: any) => apiRequest<any>('/agendamentos', { method: 'POST', body: JSON.stringify(data) }),
  checkAvailability: async (professionalId: string, startTime: string, endTime: string) => {
    const query = new URLSearchParams({ professionalId, startTime, endTime })
    return apiRequest<any>(`/agendamentos/check-availability?${query.toString()}`)
  },
  getAvailableSlots: async (professionalId: string, date: string, durationMinutes: number) => {
    const query = new URLSearchParams({ professionalId, date, durationMinutes: durationMinutes.toString() })
    return apiRequest<string[]>(`/agendamentos/available-slots?${query.toString()}`)
  },
  update: async (id: number, data: any) => apiRequest<any>(`/agendamentos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: async (id: number) => apiRequest<{ id: number }>(`/agendamentos/${id}`, { method: 'DELETE' }),
}

// Leads
export const leadsApi = {
  getAll: async (params?: { page?: number; pageSize?: number; search?: string; status?: string; professionalId?: number }) => {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', params.page.toString())
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString())
    if (params?.search) query.append('search', params.search)
    if (params?.status) query.append('status', params.status)
    if (params?.professionalId) query.append('professionalId', params.professionalId.toString())
    
    return apiRequest<Array<any>>(`/leads?${query.toString()}`)
  },
  getById: async (id: number) => apiRequest<any>(`/leads/${id}`),
  create: async (data: any) => apiRequest<any>('/leads', { method: 'POST', body: JSON.stringify(data) }),
  update: async (id: number, data: any) => apiRequest<any>(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: async (id: number) => apiRequest<{ id: number }>(`/leads/${id}`, { method: 'DELETE' }),
}

// Catálogos
export const catalogsApi = {
  getAll: async (params?: { page?: number; pageSize?: number; search?: string; professionalId?: number }) => {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', params.page.toString())
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString())
    if (params?.search) query.append('search', params.search)
    if (params?.professionalId) query.append('professionalId', params.professionalId.toString())
    
    return apiRequest<Array<any>>(`/catalogo?${query.toString()}`)
  },
  getById: async (id: number) => apiRequest<any>(`/catalogo/${id}`),
  create: async (data: any) => apiRequest<any>('/catalogo', { method: 'POST', body: JSON.stringify(data) }),
  update: async (id: number, data: any) => apiRequest<any>(`/catalogo/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: async (id: number) => apiRequest<{ id: number }>(`/catalogo/${id}`, { method: 'DELETE' }),
}

// Módulos do sistema
export const modulesApi = {
  getAll: async () => apiRequest<Array<any>>('/modules'),
  getByCode: async (code: string) => apiRequest<any>(`/modules/${code}`),
  create: async (data: any) => apiRequest<any>('/modules', { method: 'POST', body: JSON.stringify(data) }),
  update: async (id: number, data: any) => apiRequest<any>(`/modules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: async (id: number) => apiRequest<{ id: number }>(`/modules/${id}`, { method: 'DELETE' }),
}

// Permissões
export const permissionsApi = {
  // Permissões de profissionais
  getProfessionalPermissions: async (professionalId: number) => 
    apiRequest<Array<{ moduleId: number; moduleCode: string; moduleName: string; moduleIcon?: string; hasAccess: boolean }>>(`/permissions/professional/${professionalId}`),
  updateProfessionalPermissions: async (professionalId: number, permissions: Array<{ moduleId: number; hasAccess: boolean }>) => 
    apiRequest<any>(`/permissions/professional/${professionalId}`, { method: 'PUT', body: JSON.stringify({ permissions }) }),
  
  // Permissões de usuários
  getUserPermissions: async (userId: number) => 
    apiRequest<Array<{ moduleId: number; moduleCode: string; moduleName: string; moduleIcon?: string; hasAccess: boolean; canEdit?: boolean }>>(`/permissions/user/${userId}`),
  updateUserPermissions: async (userId: number, permissions: Array<{ moduleId: number; hasAccess: boolean }>) => 
    apiRequest<any>(`/permissions/user/${userId}`, { method: 'PUT', body: JSON.stringify({ permissions }) }),
  
  // Minhas permissões (usuário logado)
  getMyPermissions: async () => 
    apiRequest<Array<{ moduleCode: string; moduleName: string; hasAccess: boolean }>>('/permissions/my-permissions'),
}

// Empresas
export const empresasApi = {
  getMyCompany: async () => apiRequest<any>('/empresas/my-company'),
  getById: async (id: number) => apiRequest<any>(`/empresas/${id}`),
  update: async (id: number, data: any) => apiRequest<any>(`/empresas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
}

