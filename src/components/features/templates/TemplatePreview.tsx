'use client'

const SAMPLE_VALUES: Record<string, string> = {
  name: 'Budi Santoso',
  event_title: 'ERP Summit Jakarta 2026',
  date: '15 April 2026',
  venue: 'JCC Senayan Hall A',
}

interface TemplatePreviewProps {
  body: string
}

export function TemplatePreview({ body }: TemplatePreviewProps) {
  const preview = body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => SAMPLE_VALUES[key] ?? `{{${key}}}`)

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-md p-4 min-h-[120px]">
      <p className="text-xs text-gray-400 uppercase font-medium mb-2">Preview</p>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{preview || <span className="text-gray-300 italic">Isi pesan akan tampil di sini...</span>}</p>
    </div>
  )
}
