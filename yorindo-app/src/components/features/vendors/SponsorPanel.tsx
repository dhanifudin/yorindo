'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useEventSponsors, useAttachSponsor, useUpdateSponsorTier, useRemoveSponsor } from '@/hooks/useEventSponsors'
import { useVendors } from '@/hooks/useVendors'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { EventSponsor } from '@/types/api'

const TIER_CONFIG: Record<EventSponsor['tier'], { label: string; className: string }> = {
  standard: { label: 'Standard', className: 'bg-muted text-muted-foreground' },
  premium: { label: 'Premium', className: 'bg-blue-100 text-blue-700' },
  lead_intelligence: { label: 'Lead Intel', className: 'bg-purple-100 text-purple-700' },
}

const TIER_OPTIONS: EventSponsor['tier'][] = ['standard', 'premium', 'lead_intelligence']

interface SponsorPanelProps {
  eventId: string
}

export function SponsorPanel({ eventId }: SponsorPanelProps) {
  const { data: sponsors = [], isLoading } = useEventSponsors(eventId)
  const { data: vendorsData } = useVendors()
  const { mutate: attachSponsor, isPending: isAttaching } = useAttachSponsor(eventId)
  const { mutate: updateTier } = useUpdateSponsorTier(eventId)
  const { mutate: removeSponsor, isPending: isRemoving } = useRemoveSponsor(eventId)

  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedVendorId, setSelectedVendorId] = useState('')
  const [selectedTier, setSelectedTier] = useState<EventSponsor['tier']>('standard')
  const [removeTarget, setRemoveTarget] = useState<EventSponsor | null>(null)

  const allVendors = vendorsData?.data ?? []
  const attachedVendorIds = new Set(sponsors.map((s) => s.vendor_id))
  const availableVendors = allVendors.filter((v) => !attachedVendorIds.has(v.id))

  const handleAttach = () => {
    if (!selectedVendorId) return
    attachSponsor(
      { vendorId: selectedVendorId, tier: selectedTier },
      {
        onSuccess: () => {
          setShowAddForm(false)
          setSelectedVendorId('')
          setSelectedTier('standard')
          toast.success('Vendor berhasil ditambahkan')
        },
        onError: () => toast.error('Gagal menambahkan vendor'),
      }
    )
  }

  const handleTierChange = (vendorId: string, tier: EventSponsor['tier']) => {
    updateTier({ vendorId, tier }, {
      onError: () => toast.error('Gagal mengubah tier'),
    })
  }

  const handleRemove = () => {
    if (!removeTarget) return
    removeSponsor(removeTarget.vendor_id, {
      onSuccess: () => {
        toast.success(`${removeTarget.vendor_name} dihapus dari event`)
        setRemoveTarget(null)
      },
      onError: () => {
        toast.error('Gagal menghapus vendor')
        setRemoveTarget(null)
      },
    })
  }

  const selectClassName =
    'h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground uppercase font-medium tracking-wide">Vendor</p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={() => setShowAddForm((v) => !v)}
        >
          Tambah Vendor
        </Button>
      </div>

      {/* Add sponsor inline form */}
      {showAddForm && (
        <div className="rounded-lg border border-dashed border-border p-3 space-y-2 bg-muted/30">
          <select
            value={selectedVendorId}
            onChange={(e) => setSelectedVendorId(e.target.value)}
            className={`${selectClassName} w-full`}
            aria-label="Pilih vendor"
          >
            <option value="">— Pilih vendor —</option>
            {availableVendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value as EventSponsor['tier'])}
              className={`${selectClassName} flex-1`}
              aria-label="Pilih tier"
            >
              {TIER_OPTIONS.map((t) => (
                <option key={t} value={t}>{TIER_CONFIG[t].label}</option>
              ))}
            </select>
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={handleAttach}
              disabled={!selectedVendorId || isAttaching}
            >
              {isAttaching ? 'Menambahkan...' : 'Tambah'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => { setShowAddForm(false); setSelectedVendorId('') }}
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      {/* Sponsor list */}
      {isLoading && (
        <p className="text-xs text-muted-foreground">Memuat...</p>
      )}

      {!isLoading && sponsors.length === 0 && (
        <p className="text-sm text-muted-foreground">Belum ada vendor</p>
      )}

      {sponsors.map((sponsor) => {
        const tierCfg = TIER_CONFIG[sponsor.tier]
        return (
          <div
            key={sponsor.id}
            className="flex items-center gap-2"
          >
            <span className="flex-1 text-sm font-medium truncate">{sponsor.vendor_name}</span>
            <select
              value={sponsor.tier}
              onChange={(e) => handleTierChange(sponsor.vendor_id, e.target.value as EventSponsor['tier'])}
              className={`${selectClassName} w-28`}
              aria-label={`Tier ${sponsor.vendor_name}`}
            >
              {TIER_OPTIONS.map((t) => (
                <option key={t} value={t}>{TIER_CONFIG[t].label}</option>
              ))}
            </select>
            <Badge className={`text-xs shrink-0 ${tierCfg.className}`}>
              {tierCfg.label}
            </Badge>
            <button
              type="button"
              onClick={() => setRemoveTarget(sponsor)}
              disabled={isRemoving}
              className="text-muted-foreground hover:text-destructive transition-colors text-sm"
              aria-label={`Hapus ${sponsor.vendor_name}`}
            >
              ×
            </button>
          </div>
        )
      })}

      <AlertDialog open={!!removeTarget} onOpenChange={(open) => { if (!open) setRemoveTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{removeTarget?.vendor_name}</strong> akan dihapus dari daftar vendor event ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
