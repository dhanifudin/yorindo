import ClientPage from './_client'

export const dynamic = 'force-static'

export function generateStaticParams() {
  return [{ token: '_' }]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Page(props: any) {
  return <ClientPage {...props} />
}
