export const dynamic = 'force-dynamic'

import { CheckinAdminView } from './_client'

export default function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  return <CheckinAdminView params={params} />
}
