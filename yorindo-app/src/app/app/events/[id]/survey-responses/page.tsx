import { use } from 'react'
import SurveyResponsesClient from './_client'

interface SurveyResponsesPageProps {
  params: Promise<{ id: string }>
}

export default function SurveyResponsesPage({ params }: SurveyResponsesPageProps) {
  const { id } = use(params)
  return <SurveyResponsesClient id={id} />
}
