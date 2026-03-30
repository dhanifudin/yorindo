import { CheckinAdminView } from './_client'

export const dynamic = 'force-static'

export function generateStaticParams() {
  return ['event-001', 'event-002', 'event-003', 'event-004', 'event-005', 'event-006'].map((id) => ({ id }))
}

export default function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  return <CheckinAdminView params={params} />
}
