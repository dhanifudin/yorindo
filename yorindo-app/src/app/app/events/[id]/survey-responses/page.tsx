import { use } from 'react'
import SurveyResponsesClient from './_client'

interface SurveyResponsesPageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-static'

export function generateStaticParams() {
  return ['event-001', 'event-002', 'event-003', 'event-004', 'event-005'].map((id) => ({ id }))
}

export default function SurveyResponsesPage({ params }: SurveyResponsesPageProps) {
  const { id } = use(params)
  return <SurveyResponsesClient id={id} />
}
