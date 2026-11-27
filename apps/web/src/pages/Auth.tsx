import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Heart } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { AuthLayout } from '../components/Layout'
import { Spinner } from '../components/ui'

/** Turn a failed API call into the honest message the user should see.
 *  The old code swallowed every failure as "invalid password" / "already
 *  taken", so a rate-limit (429), a validation error or a network failure all
 *  looked like a wrong password to the user. */
function serverMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    if (e.status === 429) return 'Too many attempts. Please wait a minute and try again.'
    if (e.status === 0) return 'Could not reach the server. Check your connection and try again.'
    if (e.message) return e.message
  }
  return fallback
}

const emailSchema = z.string().email('Enter a valid email address')
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters')

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-error" role="alert">{error}</p>}
    </div>
  )
}

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input pr-11" />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  )
}

const loginSchema = z.object({ email: z.string().min(1, 'Enter your email or username'), password: z.string().min(1, 'Password is required') })
type LoginForm = z.infer<typeof loginSchema>

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const [showPw, setShowPw] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })
  const onSubmit = async (v: LoginForm) => {
    setServerError('')
    try { await login(v.email, v.password); navigate('/dashboard') } catch (e) { setServerError(serverMessage(e, 'Invalid email/username or password. Please try again.')) }
  }
  return (
    <AuthLayout>
      <h1 className="font-display text-2xl font-extrabold text-ink">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Log in to confess, connect and match.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <Field label="Email or username" error={errors.email?.message}><input type="text" autoComplete="username" className="input" placeholder="you@example.com or your_username" {...register('email')} /></Field>
        <Field label="Password" error={errors.password?.message}>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} className="input pr-11" placeholder="Your password" {...register('password')} aria-label="Password" />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </Field>
        {serverError && <p className="text-sm text-error" role="alert">{serverError}</p>}
        <button className="btn-gradient w-full" disabled={isSubmitting}>{isSubmitting ? <Spinner /> : 'Log in'}</button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <Link to="/forgot-password" className="font-semibold text-purple">Forgot password?</Link>
        <Link to="/register" className="font-semibold text-purple">Create account</Link>
      </div>
      <p className="mt-4 rounded-2xl bg-lavender/50 p-3 text-xs text-muted"><Heart className="mr-1 inline h-3.5 w-3.5 fill-pink text-pink" /> Crush and Confo is for adults 18+ only. Your date of birth is checked by the server when you register.</p>
    </AuthLayout>
  )
}

const registerSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers and underscores'),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  dob: z.string().refine((v) => {
    if (!v) return false
    const age = (Date.now() - new Date(v).getTime()) / (365.25 * 24 * 3600_000)
    return age >= 18
  }, 'You must be at least 18 years old'),
  gender: z.string().min(1, 'Select your gender'),
  country: z.string().min(2, 'Enter your country'),
  city: z.string().min(2, 'Enter your city'),
  terms: z.boolean().refine((v) => v, 'You must accept the Terms and confirm you are 18+'),
}).refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })
type RegisterForm = z.infer<typeof registerSchema>

export function Register() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema), defaultValues: { gender: '', country: 'Bangladesh', city: '' } })
  const password = watch('password') || ''
  const onSubmit = async (v: RegisterForm) => {
    setServerError('')
    try {
      const res = await api.register(v)
      // While email delivery is not configured the server returns a
      // one-time verification token instead of sending an email. Hand it to
      // the verify page (and keep a copy for this tab only) so the user can
      // verify right now instead of waiting for an email that will never
      // arrive. Login is NOT blocked on verification either way.
      if (res.devVerificationToken) {
        try { sessionStorage.setItem('cc-verify-token', res.devVerificationToken) } catch { /* private mode */ }
        navigate('/verify-email', { state: { devToken: res.devVerificationToken } })
      } else {
        navigate('/verify-email')
      }
    } catch (e) { setServerError(serverMessage(e, 'Registration failed. The username or email may already be taken.')) }
  }
  return (
    <AuthLayout>
      <h1 className="font-display text-2xl font-extrabold text-ink">Create your account</h1>
      <p className="mt-1 text-sm text-muted">Confess, connect and match with real people across Bangladesh. You must be 18+ — the server checks your date of birth.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <Field label="Full name" error={errors.fullName?.message}><input className="input" placeholder="Your full name" {...register('fullName')} /></Field>
        <Field label="Username" error={errors.username?.message}><input className="input" placeholder="your_username" {...register('username')} /></Field>
        <Field label="Email" error={errors.email?.message}><input type="email" className="input" placeholder="you@example.com" {...register('email')} /></Field>
        <Field label="Password" error={errors.password?.message}><PasswordInput value={password} onChange={(v) => setValue('password', v)} placeholder="At least 8 characters" /></Field>
        <Field label="Confirm password" error={errors.confirmPassword?.message}><input type="password" className="input" placeholder="Repeat your password" {...register('confirmPassword')} /></Field>
        <Field label="Date of birth" error={errors.dob?.message}><input type="date" className="input" {...register('dob')} /></Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Gender" error={errors.gender?.message}>
            <select className="input" {...register('gender')}><option value="">Select</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option></select>
          </Field>
          <Field label="City" error={errors.city?.message}><input className="input" placeholder="Dhaka" {...register('city')} /></Field>
        </div>
        <div>
          <Field label="Country" error={errors.country?.message}><input className="input" placeholder="Bangladesh" {...register('country')} /></Field>
        </div>
        <label className="flex items-start gap-2 text-sm text-ink/85">
          <input type="checkbox" className="mt-1 accent-purple" {...register('terms')} />
          <span>I confirm I am 18 years or older and I accept the <Link className="font-semibold text-purple" to="/terms">Terms</Link> and <Link className="font-semibold text-purple" to="/privacy">Privacy Policy</Link>.</span>
        </label>
        {errors.terms && <p className="text-xs text-error" role="alert">{errors.terms.message}</p>}
        {serverError && <p className="text-sm text-error" role="alert">{serverError}</p>}
        <button className="btn-gradient w-full" disabled={isSubmitting}>{isSubmitting ? <Spinner /> : 'Create account'}</button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">Already have an account? <Link to="/login" className="font-semibold text-purple">Log in</Link></p>
    </AuthLayout>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [devToken, setDevToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    try {
      const res = await api.forgotPassword(email)
      setDevToken(res.devResetToken ?? null)
      setSent(true)
    } catch (err) { setError(serverMessage(err, 'Could not send the reset link. Please try again.')) }
  }
  return (
    <AuthLayout>
      <h1 className="font-display text-2xl font-extrabold text-ink">Forgot password?</h1>
      <p className="mt-1 text-sm text-muted">Enter your email and we will send you a password reset link.</p>
      {sent ? (
        devToken ? (
          <div className="mt-6 rounded-2xl bg-lavender/50 p-4" role="status">
            <p className="font-semibold text-ink">Email delivery is still being set up, so no email was sent.</p>
            <p className="mt-1 text-sm text-muted">Use this one-time link to reset your password now — it expires in 1 hour.</p>
            <Link to={`/reset-password?token=${devToken}`} className="btn-gradient mt-4 w-full">Reset my password now</Link>
          </div>
        ) : (
          <p className="mt-6 rounded-2xl bg-success/10 p-4 font-semibold text-success" role="status">Reset link sent to {email}. Check your inbox (and spam folder).</p>
        )
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div><label className="label" htmlFor="fp-email">Email</label><input id="fp-email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
          {error && <p className="text-sm text-error" role="alert">{error}</p>}
          <button className="btn-gradient w-full">Send reset link</button>
        </form>
      )}
      <p className="mt-4 text-center text-sm text-muted"><Link to="/login" className="font-semibold text-purple">Back to log in</Link></p>
    </AuthLayout>
  )
}

export function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    try { await api.resetPassword(token, password); setDone(true); setTimeout(() => navigate('/login'), 2000) } catch (e) { setError(serverMessage(e, 'Reset link is invalid or expired. Request a new one.')) }
  }
  return (
    <AuthLayout>
      <h1 className="font-display text-2xl font-extrabold text-ink">Reset your password</h1>
      {done ? <p className="mt-6 rounded-2xl bg-success/10 p-4 font-semibold text-success" role="status">Password updated! Redirecting you to log in…</p> : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div><label className="label">New password</label><PasswordInput value={password} onChange={setPassword} placeholder="At least 8 characters" /></div>
          <div><label className="label">Confirm new password</label><PasswordInput value={confirm} onChange={setConfirm} placeholder="Repeat your password" /></div>
          {error && <p className="text-sm text-error" role="alert">{error}</p>}
          {!token && <p className="text-sm text-warning">No reset token found in the link. Request a new reset link from the forgot-password page.</p>}
          <button className="btn-gradient w-full">Reset password</button>
        </form>
      )}
    </AuthLayout>
  )
}

export function VerifyEmail() {
  const [params] = useSearchParams()
  const location = useLocation()
  const token = params.get('token') || ''
  // While email delivery is not configured, registration hands the
  // one-time token to this page directly (navigation state + this tab's
  // session storage) so verification can finish here — no email needed.
  // Login is never blocked on verification, so this is a convenience,
  // not a gate.
  const devToken = ((location.state as { devToken?: string } | null)?.devToken) || (() => { try { return sessionStorage.getItem('cc-verify-token') || '' } catch { return '' } })()
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle')
  const [devError, setDevError] = useState('')
  const check = async (tok: string) => {
    setStatus('checking')
    try {
      await api.verifyEmail(tok)
      try { sessionStorage.removeItem('cc-verify-token') } catch { /* ignore */ }
      setStatus('ok')
    } catch (e) { setStatus('error'); setDevError(serverMessage(e, 'Verification failed.')) }
  }
  useEffect(() => { if (token) void check(token) }, [token])
  return (
    <AuthLayout>
      <h1 className="font-display text-2xl font-extrabold text-ink">Verify your email</h1>
      <p className="mt-1 text-sm text-muted">We sent a verification link to your email. Click it, or verify here if you already have the link open.</p>
      {status === 'ok' ? (
        <p className="mt-6 rounded-2xl bg-success/10 p-4 font-semibold text-success" role="status">Email verified! Welcome to Crush and Confo. <Link className="underline" to="/login">Log in</Link></p>
      ) : status === 'error' ? (
        <p className="mt-6 rounded-2xl bg-error/10 p-4 font-semibold text-error" role="alert">This verification link is invalid or expired. {devError} Please register again or contact support.</p>
      ) : !token ? (
        devToken ? (
          <div className="mt-6 rounded-2xl bg-lavender/50 p-4" role="status">
            <p className="font-semibold text-ink">Email delivery is still being set up, so no verification email was sent.</p>
            <p className="mt-1 text-sm text-muted">You can verify your email right now with one tap — or just <Link className="font-semibold text-purple" to="/login">log in</Link>, verification is not required to log in.</p>
            <button className="btn-gradient mt-4 w-full" disabled={status === 'checking'} onClick={() => void check(devToken)}>{status === 'checking' ? <Spinner /> : 'Verify my email now'}</button>
          </div>
        ) : (
          <p className="mt-6 rounded-2xl bg-lavender/50 p-4 text-sm text-muted">No verification link was opened. Check your email for the link — email delivery is still being set up, so if it has not arrived yet, you can still <Link className="font-semibold text-purple" to="/login">log in</Link> and verify later.</p>
        )
      ) : (
        <p className="mt-6 rounded-2xl bg-lavender/50 p-4 text-sm text-muted">Verifying your email…</p>
      )}
      <p className="mt-4 text-center text-sm text-muted">Didn't get the email? Check spam, or <Link to="/register" className="font-semibold text-purple">register again</Link>.</p>
    </AuthLayout>
  )
}
