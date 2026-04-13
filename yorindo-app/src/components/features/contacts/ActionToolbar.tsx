'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Send } from 'lucide-react'

interface ActionToolbarProps {
  total: number
  isVisible: boolean
  selectedIds: string[]
  selectedNames?: string[]
  onClearSelection: () => void
  onOpenBlastModal: () => void
}

export function ActionToolbar({
  total,
  isVisible,
  selectedIds,
  onClearSelection,
  onOpenBlastModal,
}: ActionToolbarProps) {
  if (!isVisible) return null

  const isSelectedMode = selectedIds.length > 0
  const blastLabel = isSelectedMode
    ? `Blast ${selectedIds.length} kontak →`
    : `Blast Segmen · ${total} kontak →`

  return (
    <Card className="sticky bottom-0 z-10 rounded-none border-t border-x-0 border-b-0 shadow-md">
      <div className="flex items-center justify-between px-4 py-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">
            {isSelectedMode
              ? `${selectedIds.length} kontak terpilih di halaman ini`
              : `${total} kontak di segmen ini`}
          </span>
          {isSelectedMode && (
            <>
              <Badge variant="secondary">{selectedIds.length} terpilih</Badge>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={onClearSelection}
              >
                × Batalkan
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={onOpenBlastModal} className="gap-2">
            <Send className="w-3.5 h-3.5" />
            {blastLabel}
          </Button>
        </div>
      </div>
    </Card>
  )
}

