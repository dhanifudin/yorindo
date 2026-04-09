'use client'

import { useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Send } from 'lucide-react'
import { toast } from 'sonner'

interface BlastEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedContacts: { id: string; name: string }[]
  onSuccess?: () => void
}

export function BlastEventDialog({
  open,
  onOpenChange,
  selectedContacts,
  onSuccess,
}: BlastEventDialogProps) {
  const [link, setLink] = useState('')
  const [linkError, setLinkError] = useState('')
  const [isBlasting, setIsBlasting] = useState(false)

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setLink('')
      setLinkError('')
    }
    onOpenChange(v)
  }

  const validateLink = (val: string) => {
    if (!val.trim()) return 'Link event wajib diisi'
    try {
      const url = new URL(val.trim())
      if (!['http:', 'https:'].includes(url.protocol)) return 'Link harus dimulai dengan http:// atau https://'
    } catch {
      return 'Link tidak valid, contoh: https://event.emu.com/xyz'
    }
    return ''
  }

  const handleBlast = async () => {
    const err = validateLink(link)
    if (err) {
      setLinkError(err)
      return
    }

    setIsBlasting(true)
    try {
      const res = await fetch('/api/contacts/blast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactIds: selectedContacts.map((c) => c.id),
          eventLink: link.trim(),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message ?? 'Blast gagal')
      }

      toast.success(
        `Blast berhasil dikirim ke ${selectedContacts.length} kontak!`,
        { description: link.trim() }
      )
      handleOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Blast gagal, coba lagi')
    } finally {
      setIsBlasting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Blast Event
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Penerima */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Penerima ({selectedContacts.length} kontak)
            </Label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-md border bg-muted/30">
              {selectedContacts.map((c) => (
                <Badge
                  key={c.id}
                  variant="secondary"
                  className="text-xs font-normal"
                >
                  {c.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Link event */}
          <div className="space-y-2">
            <Label htmlFor="blast-link">Link Event</Label>
            <Input
              id="blast-link"
              type="url"
              placeholder="https://event.emu.com/..."
              value={link}
              onChange={(e) => {
                setLink(e.target.value)
                if (linkError) setLinkError('')
              }}
              className={linkError ? 'border-destructive focus-visible:ring-destructive' : ''}
              autoFocus
            />
            {linkError && (
              <p className="text-xs text-destructive">{linkError}</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isBlasting}>
            Batal
          </Button>
          <Button onClick={handleBlast} disabled={isBlasting || selectedContacts.length === 0} className="gap-2">
            <Send className="w-3.5 h-3.5" />
            {isBlasting ? 'Mengirim…' : `Blast ${selectedContacts.length} Kontak`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}