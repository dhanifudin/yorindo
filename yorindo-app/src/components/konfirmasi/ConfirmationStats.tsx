import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle, Clock, Users } from 'lucide-react'

interface ConfirmationStatsProps {
  ticketSent: number
  pendingConfirmation: number
  waitlisted: number
  isLoading: boolean
}

const STATS = [
  {
    key: 'ticketSent' as const,
    label: 'Tiket Terkirim',
    icon: CheckCircle,
    iconClass: 'text-green-600',
    bgClass: 'bg-green-50',
  },
  {
    key: 'pendingConfirmation' as const,
    label: 'Menunggu Konfirmasi',
    icon: Clock,
    iconClass: 'text-amber-600',
    bgClass: 'bg-amber-50',
  },
  {
    key: 'waitlisted' as const,
    label: 'Daftar Tunggu',
    icon: Users,
    iconClass: 'text-blue-600',
    bgClass: 'bg-blue-50',
  },
]

export function ConfirmationStats({ ticketSent, pendingConfirmation, waitlisted, isLoading }: ConfirmationStatsProps) {
  const values = { ticketSent, pendingConfirmation, waitlisted }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {STATS.map(({ key, label, icon: Icon, iconClass, bgClass }) => (
        <Card key={key}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-full p-2 ${bgClass}`}>
                <Icon className={`h-4 w-4 ${iconClass}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-medium">{label}</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-0.5" />
                ) : (
                  <p className="text-2xl font-bold">{values[key].toLocaleString('id-ID')}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
