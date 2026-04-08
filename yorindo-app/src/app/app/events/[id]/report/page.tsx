import ClientPage from './_client'

export const dynamic = 'force-static'

export function generateStaticParams() {
  return ['event-001', 'event-002', 'event-003', 'event-004', 'event-005', 'e44rnx7cg7cstacu725iolms'].map((id) => ({ id }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Page(props: any) {
  return <ClientPage {...props} />
}
