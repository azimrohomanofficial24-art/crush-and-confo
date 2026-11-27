import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import type { User } from './types'

interface AuthCtx { user: User | null; loading: boolean; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>; refresh: () => void }
const Ctx = createContext<AuthCtx>({ user: null, loading: true, login: async () => {}, logout: async () => {}, refresh: () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [demoUser, setDemoUser] = useState<User | null>(null)
  const { data, isLoading } = useQuery({ queryKey: ['me'], queryFn: () => api.me(), retry: false, staleTime: 60_000 })
  useEffect(() => { if (data) setDemoUser(data) }, [data])
  const user = data ?? demoUser
  const login = async (email: string, password: string) => {
    const u = await api.login(email, password)
    setDemoUser(u)
    qc.invalidateQueries({ queryKey: ['me'] })
  }
  const logout = async () => { await api.logout(); setDemoUser(null); qc.invalidateQueries({ queryKey: ['me'] }) }
  const refresh = () => qc.invalidateQueries({ queryKey: ['me'] })
  return <Ctx.Provider value={{ user: user ?? null, loading: isLoading, login, logout, refresh }}>{children}</Ctx.Provider>
}
export const useAuth = () => useContext(Ctx)
