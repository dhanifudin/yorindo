import ClientPage from './_client'

export const dynamic = 'force-static'

export function generateStaticParams() {
  return ['seminar-erp-jakarta', 'workshop-ai-untuk-bisnis', 'forum-kesehatan-digital-surabaya', 'konferensi-manufaktur-2025', 'summit-properti-bali'].map((eventSlug) => ({ eventSlug }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Page(props: any) {
  return <ClientPage {...props} />
}
