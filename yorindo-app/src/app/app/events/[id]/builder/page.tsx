import { use } from 'react'
import SurveyBuilderClient from './_client'

interface BuilderPageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-static'

export function generateStaticParams() {
  return ['event-001', 'event-002', 'event-003', 'event-004', 'event-005'].map((id) => ({ id }))
}

export default function BuilderPage({ params }: BuilderPageProps) {
  const { id } = use(params)
  return <SurveyBuilderClient id={id} />
}
