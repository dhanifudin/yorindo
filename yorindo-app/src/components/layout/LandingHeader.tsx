'use client'

import { useState } from 'react'
import { Shield, Menu, X } from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Overview',  href: '#overview'  },
  { label: 'Sistem',    href: '#sistem'    },
  { label: 'Workflow',  href: '#workflow'  },
  { label: 'Keamanan',  href: '#akses'    },
]

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/60">
      <div className="container flex h-[72px] items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 ring-2 ring-primary/20">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-bold tracking-tight text-foreground leading-tight">
              Yorindo
            </span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
              Communication
            </span>
          </div>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="px-4 py-2 text-[13px] font-medium text-muted-foreground rounded-lg transition-all hover:text-foreground hover:bg-muted/60"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background px-6 pb-4 pt-2">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </header>
  )
}
