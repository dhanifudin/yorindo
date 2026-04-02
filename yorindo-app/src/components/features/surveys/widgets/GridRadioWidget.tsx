import React from 'react'
import { WidgetProps } from '@rjsf/utils'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

export default function GridRadioWidget(props: WidgetProps) {
  const { schema, id, value, onChange, disabled, readonly } = props
  
  // Custom schema extension: x-widget: grid_radio
  // properties: { rows: { default: [...] }, columns: { default: [...] } }
  const rows = (schema as any).properties?.rows?.default || []
  const columns = (schema as any).properties?.columns?.default || []
  
  const currentValues = value || {}

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-muted/50">
          <tr>
            <th className="p-3 text-left font-medium border-b min-w-[200px]"></th>
            {columns.map((col: string) => (
              <th key={col} className="p-3 text-center font-medium border-b whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row: string) => (
            <tr key={row} className="hover:bg-muted/30 transition-colors">
              <td className="p-3 border-b font-medium">{row}</td>
              {columns.map((col: string) => (
                <td key={col} className="p-3 border-b text-center">
                  <div className="flex justify-center">
                    <RadioGroup
                      value={currentValues[row]}
                      onValueChange={(newVal) => {
                        onChange({ ...currentValues, [row]: newVal })
                      }}
                      disabled={disabled || readonly}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={col} id={`${id}-${row}-${col}`} />
                        <Label htmlFor={`${id}-${row}-${col}`} className="sr-only">
                          {col}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
