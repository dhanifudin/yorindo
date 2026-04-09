import Image from 'next/image'

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — hidden on mobile */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative overflow-hidden bg-black">
        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Glow blob 1 */}
        <div className="absolute rounded-full blur-[100px] opacity-20 w-[500px] h-[500px] bg-white -top-32 -left-32 pointer-events-none" />
        {/* Glow blob 2 */}
        <div className="absolute rounded-full blur-[100px] opacity-15 w-[400px] h-[400px] bg-gray-300 bottom-0 -right-24 pointer-events-none" />

        {/* Logo chip */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-3 py-2 pr-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 backdrop-blur">
              <Image
                src="/icons/icon.jpg"
                alt="EM · U"
                width={20}
                height={20}
                className="rounded-full"
              />
            </div>
            <span className="text-sm font-semibold text-white">EM · U Admin</span>
          </div>
        </div>

        {/* Center copy */}
        <div className="relative z-10 space-y-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Secure Platform
          </p>
          <h2 className="text-5xl font-black leading-tight text-white">
            Admin
            <br />
            <span className="text-gray-400">Platform</span>
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-white/60">
            Platform terpusat untuk mengelola event, kontak, undangan, dan laporan organisasi Anda dengan aman.
          </p>
        </div>

        {/* Status bar */}
        <div className="relative z-10 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-white/40">
            All systems operational
          </span>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-black">
            <Image
              src="/icons/icon.jpg"
              alt="EM · U"
              width={18}
              height={18}
              className="rounded"
            />
          </div>
          <span className="text-lg font-bold text-black">EM · U</span>
        </div>
        
        {children}
      </div>
    </div>
  )
}