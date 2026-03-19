import { ContactsFilterBar } from '@/components/features/contacts/ContactsFilterBar'
import { ContactsPagination } from '@/components/features/contacts/ContactsPagination'
import { ContactsTable } from '@/components/features/contacts/ContactsTable'

export default function ContactsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Database Kontak</h1>
      <ContactsFilterBar />
      <ContactsTable />
      <ContactsPagination />
    </div>
  )
}
