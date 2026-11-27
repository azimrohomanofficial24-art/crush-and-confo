import { createContext, useContext, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import type { User } from './types'

interface AuthCtx { user: User | null; loading: boolean; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>; refresh: () => void }
const Ctx = createContext<AuthCtx>({ user: null, loading: true, login: async () => {}, logout: async () => {}, refresh: () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['me'], queryFn: () => api.me(), retry: false, staleTime: 60_000 })
  const login = async (email: string, password: string) => {
    await api.login(email, password)
    qc.invalidateQueries({ queryKey: ['me'] })
  }
  const logout = async () => { await api.logout(); qc.invalidateQueries({ queryKey: ['me'] }); qc.clear() }
  const refresh = () => qc.invalidateQueries({ queryKey: ['me'] })
  return <Ctx.Provider value={{ user: data ?? null, loading: isLoading, login, logout, refresh }}>{children}</Ctx.Provider>
}
export const useAuth = () => useContext(Ctx)
