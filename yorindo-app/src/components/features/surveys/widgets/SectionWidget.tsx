import React from 'react'
import { WidgetProps } from '@rjsf/utils'

export default function SectionWidget(props: WidgetProps) {
  const { label, schema } = props
  
  return (
    <div className="py-6 border-b mb-6 mt-8 first:mt-2 last:border-b-0">
      <h3 className="text-xl font-bold tracking-tight text-foreground">{label}</h3>
      {schema.description && (
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          {schema.description}
        </p>
      )}
    </div>
  )
}
