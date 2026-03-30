'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GoogleIcon } from '@/components/icons/GoogleIcon'

interface MockGoogleAuthDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: (name: string, email: string) => void
}

export function MockGoogleAuthDialog({
  open,
  onOpenChange,
  onSuccess,
}: MockGoogleAuthDialogProps) {
  const [mockName, setMockName] = useState('Budi Peserta')
  const [mockEmail, setMockEmail] = useState('budi.peserta@gmail.com')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setMockName('Budi Peserta')
    setMockEmail('budi.peserta@gmail.com')
    setError(null)
    setIsLoading(false)
  }, [open])

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/google-mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mockName, mockEmail }),
      })
      if (!res.ok) throw new Error('Gagal')
      const { name, email } = await res.json()
      onSuccess(name, email)
      onOpenChange(false)
    } catch {
      setError('Gagal menghubungi server mock')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GoogleIcon size={18} />
            Masuk dengan Google
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-xs text-muted-foreground bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
            Mode pengembangan — simulasi Google OAuth
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="mock-name">Nama</Label>
            <Input
              id="mock-name"
              value={mockName}
              onChange={(e) => setMockName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mock-email">Email Google</Label>
            <Input
              id="mock-email"
              type="email"
              value={mockEmail}
              onChange={(e) => setMockEmail(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !mockName || !mockEmail}
          >
            {isLoading ? 'Memproses...' : 'Masuk dengan Google'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
