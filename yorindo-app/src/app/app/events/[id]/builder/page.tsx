import { use } from 'react'
import SurveyBuilderClient from './_client'

interface BuilderPageProps {
  params: Promise<{ id: string }>
}

export default function BuilderPage({ params }: BuilderPageProps) {
  const { id } = use(params)
  return <SurveyBuilderClient id={id} />
}
