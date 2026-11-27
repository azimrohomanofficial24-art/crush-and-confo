import { Link } from 'react-router-dom'

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label="Crush and Confo logo">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#F52D91" />
          <stop offset="100%" stopColor="#873BFA" />
        </linearGradient>
      </defs>
      <path d="M24 42C24 42 6 30.5 6 17.5C6 10.6 11.4 6 17.5 6C20.9 6 23.2 7.6 24 9.2C24.8 7.6 27.1 6 30.5 6C36.6 6 42 10.6 42 17.5C42 30.5 24 42 24 42Z" fill="url(#lg)" />
      <path d="M24 34.5C24 34.5 13.5 27 13.5 19.5C13.5 15.8 16.4 13.5 19.5 13.5C21.6 13.5 23.3 14.6 24 16.2C24.7 14.6 26.4 13.5 28.5 13.5C31.6 13.5 34.5 15.8 34.5 19.5C34.5 27 24 34.5 24 34.5Z" fill="#fff" opacity="0.92" />
      <path d="M24 29C24 29 18.5 24.8 18.5 20.8C18.5 18.6 20.2 17.2 22 17.2C23 17.2 23.7 17.7 24 18.4C24.3 17.7 25 17.2 26 17.2C27.8 17.2 29.5 18.6 29.5 20.8C29.5 24.8 24 29 24 29Z" fill="url(#lg)" />
    </svg>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="Crush and Confo home">
      <LogoMark size={compact ? 34 : 42} />
      {!compact && (
        <span className="leading-tight">
          <span className="block font-display font-extrabold text-[19px] text-ink">Crush and <span className="bg-gradient-to-r from-pink to-purple bg-clip-text text-transparent">Confo</span></span>
          <span className="block text-[11px] font-medium text-muted">Confess · Connect · Match</span>
        </span>
      )}
    </Link>
  )
}
