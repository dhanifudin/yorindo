'use client'

import { use } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Construction } from 'lucide-react'

export default function OnTheSpotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <div className="p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-amber-100 rounded-full">
              <Construction className="w-8 h-8 text-amber-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">On the spot Registration</CardTitle>
          <CardDescription>
            Fitur pendaftaran langsung di lokasi untuk event ID: {id}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center pb-10">
          <p className="text-muted-foreground">
            Halaman ini sedang dalam pengembangan. Fitur ini akan memungkinkan admin untuk mendaftarkan peserta secara instan saat acara berlangsung.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
