'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Overview',  href: '#overview'  },
  { label: 'Sistem',    href: '#sistem'    },
  { label: 'Workflow',  href: '#workflow'  },
  { label: 'Keamanan',  href: '#akses'    },
]

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200">
      <div className="container flex h-[72px] items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-black shadow-sm">
            <Image
              src="/icons/icon.jpg"
              alt="EM · U"
              width={24}
              height={24}
              className="rounded"
            />
          </div>
         <div className="flex flex-col">
            <span className="text-[15px] font-bold tracking-tight text-black leading-tight">
              EM · U
            </span>
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-[0.15em]">
              Platform
            </span>
          </div>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="px-4 py-2 text-[13px] font-medium text-gray-600 rounded-lg transition-all hover:text-black hover:bg-gray-100"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-6 pb-4 pt-2">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 text-sm font-medium text-gray-600 hover:text-black transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </header>
  )
}