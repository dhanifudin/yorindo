'use client'

const SAMPLE_VALUES: Record<string, string> = {
  name: 'Budi Santoso',
  event_title: 'ERP Summit Jakarta 2026',
  date: '15 April 2026',
  venue: 'JCC Senayan Hall A',
  confirm_url: 'https://example.com/confirm',
  industry: 'Teknologi',
  company: 'PT. Maju Jaya',
}

interface Props {
  body: string
  type: string
  channel: 'email' | 'whatsapp'
  logoUrl?: string
  imageType?: 'header' | 'background'
  bgOpacity?: number
  subject?: string
}

export function TemplatePreview({ body, type, channel, logoUrl, imageType = 'header', bgOpacity = 40, subject }: Props) {
  const previewHtml = body.replace(/\{\{(\w+)\}\}/g, (_, key) => SAMPLE_VALUES[key] ?? `{{${key}}}`)

  if (channel === 'email') {
    return (
      <div className="max-w-[380px] mx-auto bg-white border border-gray-200 rounded-3xl shadow-2xl overflow-hidden">
        {subject && (
          <div className="bg-gray-100 px-4 py-3 text-xs font-medium border-b">
            {subject}
          </div>
        )}

        {imageType === 'header' && logoUrl && (
          <img src={logoUrl} className="w-full h-28 object-cover" alt="header" />
        )}

        {imageType === 'background' && logoUrl ? (
          <div className="relative overflow-hidden" style={{ minHeight: 180 }}>
            <img src={logoUrl} className="absolute inset-0 w-full h-full object-cover" alt="background" />
            <div
              className="absolute inset-0"
              style={{ backgroundColor: `rgba(255,255,255,${(100 - bgOpacity) / 100})` }}
            />
            <div className="relative p-6">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="relative" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        )}
      </div>
    )
  }

  // WhatsApp Preview
  return (
    <div className="max-w-md mx-auto bg-[#e5ddd5] p-4 rounded-3xl">
      <div className="bg-white rounded-2xl p-4">
        <div dangerouslySetInnerHTML={{ __html: previewHtml.replace(/\n/g, '<br>') }} />
      </div>
    </div>
  )
}