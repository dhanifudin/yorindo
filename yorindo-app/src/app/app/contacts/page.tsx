import { Suspense } from 'react'
import { ContactsCommandCenter } from '@/components/features/contacts/ContactsCommandCenter'

export default function ContactsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Memuat...</div>}>
      <ContactsCommandCenter />
    </Suspense>
  )
}
