import { Shield } from 'lucide-react'

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — hidden on mobile */}
      <div
        className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'hsl(217 65% 10%)' }}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Glow blob 1 */}
        <div className="absolute rounded-full blur-[80px] opacity-25 w-[420px] h-[420px] bg-primary/60 -top-20 -left-20 pointer-events-none" />
        {/* Glow blob 2 */}
        <div className="absolute rounded-full blur-[80px] opacity-25 w-[300px] h-[300px] bg-sky-400/40 bottom-20 -right-16 pointer-events-none" />

        {/* Logo chip */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/7 px-2 py-1.5 pr-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-blue-800">
              <Shield className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-medium text-white/85">Yorindo Admin</span>
          </div>
        </div>

        {/* Center copy */}
        <div className="relative z-10 space-y-4">
          <p className="text-xs font-medium uppercase tracking-widest text-white/35">
            Centralized Operations
          </p>
          <h2 className="text-4xl font-bold leading-tight text-white md:text-5xl">
            Secure Admin
            <br />
            <em className="text-white/50 not-italic">Access</em>
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-white/50">
            Platform terpusat untuk mengelola event, kontak, undangan, dan laporan organisasi Anda.
          </p>
        </div>

        {/* Status bar */}
        <div className="relative z-10 flex items-center gap-2">
          <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-green-400" />
          <span className="text-xs text-white/35">
            All systems operational · Internal use only
          </span>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-muted/30">
        {children}
      </div>
    </div>
  )
}
