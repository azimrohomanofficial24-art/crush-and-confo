import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Bell, Compass, Crown, Heart, Home, LogIn, LogOut, Mail, Menu, Moon, Search, Settings, Sun, Users, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { currentUser, onlineNow } from '../lib/demoData'
import { Logo, LogoMark } from './Logo'
import { Avatar, DemoBadge } from './ui'

const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/matching', label: 'Matching', icon: Heart, badge: 12 },
  { to: '/confessions', label: 'Confessions', icon: () => null, badge: 0 },
  { to: '/community', label: 'Community', icon: Users },
  { to: '/messages', label: 'Messages', icon: Mail, badge: 3 },
  { to: '/notifications', label: 'Notifications', icon: Bell, badge: 5 },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/profile/john_bay', label: 'Profile', icon: () => null },
  { to: '/settings', label: 'Settings', icon: Settings },
]
import { MessageSquareHeart, UserRound } from 'lucide-react'
const NAV_ICONS: Record<string, typeof Home> = { Confessions: MessageSquareHeart as never, Profile: UserRound as never }

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth()
  return (
    <div className="flex h-full flex-col gap-1 overflow-y-auto p-4">
      <div className="mb-4 px-1"><Logo /></div>
      <nav aria-label="Main" className="flex flex-col gap-1">
        {NAV.map((item) => {
          const Icon = NAV_ICONS[item.label] || item.icon
          return (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}>
              <Icon className="h-5 w-5 text-purple" />
              <span className="flex-1">{item.label}</span>
              {item.badge ? <span className="rounded-full bg-pink px-2 py-0.5 text-[11px] font-bold text-white">{item.badge}</span> : null}
            </NavLink>
          )
        })}
      </nav>
      <Link to="/settings?tab=premium" onClick={onNavigate} className="mt-4 rounded-3xl bg-gradient-to-br from-pink/15 via-lavender to-purple/15 p-4 border border-white/70">
        <div className="flex items-center gap-2 font-display font-bold text-ink"><Crown className="h-5 w-5 text-warning" /> Go Premium</div>
        <p className="mt-1 text-xs text-muted">Unlock more features!</p>
        <span className="btn-gradient mt-3 w-full">Upgrade Now</span>
      </Link>
      <div className="glass-soft mt-4 p-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink"><span className="h-2.5 w-2.5 rounded-full bg-success" /> Online Now</p>
        <p className="text-xs text-muted">2.4K+ People</p>
        <div className="mt-2 flex items-center">
          {onlineNow.slice(0, 4).map((u) => <Avatar key={u.id} user={u} size={30} className="-ml-1 first:ml-0 ring-2 ring-white" />)}
          <span className="ml-2 rounded-full bg-lavender px-2 py-1 text-[11px] font-bold text-purple">+99</span>
        </div>
      </div>
      <div className="mt-auto pt-4">
        {user ? (
          <button onClick={() => { logout(); onNavigate?.() }} className="nav-item w-full text-left"><LogOut className="h-5 w-5 text-error" /> Log out</button>
        ) : (
          <Link to="/login" onClick={onNavigate} className="nav-item"><LogIn className="h-5 w-5 text-purple" /> Log in</Link>
        )}
        <p className="mt-3 px-4 text-[11px] text-muted">Crush and Confo · Confess. Connect. Match.</p>
      </div>
    </div>
  )
}

export function Layout() {
  const [drawer, setDrawer] = useState(false)
  const [dark, setDark] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: notifs } = useQuery({ queryKey: ['notifications'], queryFn: () => api.notifications() })
  const unread = (notifs || []).filter((n) => !n.read).length

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inputRef.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => { document.documentElement.classList.toggle('dark-mode', dark) }, [dark])

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) navigate(`/explore?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block"><SidebarContent /></aside>
      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-bg shadow-2xl"><SidebarContent onNavigate={() => setDrawer(false)} /></aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 border-b border-white/60 bg-bg/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-3 sm:px-5">
            <button className="rounded-full p-2 hover:bg-white lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu className="h-6 w-6" /></button>
            <Link to="/" className="lg:hidden"><LogoMark size={34} /></Link>
            <form onSubmit={submitSearch} className="relative hidden flex-1 sm:block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people, posts, or confessions..."
                className="input !rounded-full !py-2.5 pl-11 pr-20 shadow-soft" aria-label="Search" />
              <kbd className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-md border border-lavender bg-white px-2 py-0.5 text-[11px] font-semibold text-muted">Ctrl + K</kbd>
            </form>
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <DemoBadge />
              <button onClick={() => setDark((d) => !d)} className="rounded-full bg-white p-2.5 shadow-soft hover:bg-lavender/50" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
                {dark ? <Sun className="h-5 w-5 text-warning" /> : <Moon className="h-5 w-5 text-purple" />}
              </button>
              <Link to="/notifications" className="relative rounded-full bg-white p-2.5 shadow-soft hover:bg-lavender/50" aria-label={`Notifications, ${unread} unread`}>
                <Bell className="h-5 w-5 text-purple" />
                {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-pink text-[10px] font-bold text-white">{unread}</span>}
              </Link>
              {user ? (
                <Link to={`/profile/${user.username}`} aria-label="Your profile"><Avatar user={user} size={40} className="ring-2 ring-white shadow-soft" /></Link>
              ) : (
                <Link to="/login" className="btn-gradient !min-h-[40px] !px-4">Log in</Link>
              )}
            </div>
          </div>
          <form onSubmit={submitSearch} className="relative px-3 pb-3 sm:hidden">
            <Search className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people, posts, or confessions..." className="input !rounded-full pl-10" aria-label="Search" />
          </form>
        </header>

        <main className="mx-auto max-w-7xl px-3 pb-24 pt-4 sm:px-5 lg:pb-10">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/70 bg-white/90 backdrop-blur-xl lg:hidden" aria-label="Mobile">
        <div className="grid grid-cols-4">
          {[
            { to: '/', label: 'Discover', icon: Compass },
            { to: '/matching', label: 'Matches', icon: Heart },
            { to: '/messages', label: 'Messages', icon: Mail },
            { to: '/profile/john_bay', label: 'Profile', icon: UserRound },
          ].map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive ? 'text-pink' : 'text-muted'}`}>
              <item.icon className="h-5 w-5" />{item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="glass p-6 sm:p-8">{children}</div>
        <p className="mt-4 text-center text-xs text-muted">
          By continuing you agree to our <Link className="text-purple underline" to="/terms">Terms</Link>, <Link className="text-purple underline" to="/privacy">Privacy Policy</Link> and <Link className="text-purple underline" to="/guidelines">Community Guidelines</Link>.
        </p>
      </div>
    </div>
  )
}
export { currentUser }
