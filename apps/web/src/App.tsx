import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './lib/auth'
import { Layout } from './components/Layout'
import Home from './pages/Home'
import Explore from './pages/Explore'
import Matching from './pages/Matching'
import Confessions from './pages/Confessions'
import Community from './pages/Community'
import Messages from './pages/Messages'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import { About, Contact, Guidelines, Privacy, Safety, Terms } from './pages/Static'
import { ForgotPassword, Login, Register, ResetPassword, VerifyEmail } from './pages/Auth'
import { Blocked, Dashboard, Followers, Following, MatchingPreferences, MyConfessions, MyMatches, RequireAuth, Saved, Settings } from './pages/Protected'
import { adminRoutes } from './pages/admin'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/matching" element={<Matching />} />
              <Route path="/confessions" element={<Confessions />} />
              <Route path="/community" element={<Community />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profile/:username" element={<Profile />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/guidelines" element={<Guidelines />} />
              <Route path="/safety" element={<Safety />} />
              <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
              <Route path="/matching-preferences" element={<RequireAuth><MatchingPreferences /></RequireAuth>} />
              <Route path="/my-matches" element={<RequireAuth><MyMatches /></RequireAuth>} />
              <Route path="/saved" element={<RequireAuth><Saved /></RequireAuth>} />
              <Route path="/my-confessions" element={<RequireAuth><MyConfessions /></RequireAuth>} />
              <Route path="/followers" element={<RequireAuth><Followers /></RequireAuth>} />
              <Route path="/following" element={<RequireAuth><Following /></RequireAuth>} />
              <Route path="/blocked" element={<RequireAuth><Blocked /></RequireAuth>} />
              <Route path="*" element={<NotFound />} />
            </Route>
            {adminRoutes.map((r) => <Route key={r.path} path={r.path} element={<r.element />} />)}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

function NotFound() {
  return (
    <div className="glass mx-auto max-w-xl p-8 text-center">
      <h1 className="font-display text-3xl font-extrabold text-ink">Page not found</h1>
      <p className="mt-2 text-sm text-muted">This page doesn't exist — but plenty of lovely ones do.</p>
      <a href="/" className="btn-gradient mt-5 inline-flex">Back home</a>
    </div>
  )
}
