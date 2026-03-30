import { cn } from '@/lib/utils'

interface PublicShellProps {
  children: React.ReactNode
  className?: string
}

export function PublicShell({ children, className }: PublicShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className={cn('max-w-xl mx-auto px-4 py-8', className)}>
        {children}
      </div>
    </div>
  )
}
