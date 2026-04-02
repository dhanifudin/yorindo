import React from 'react'
import { WidgetProps } from '@rjsf/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

export default function GridCheckboxWidget(props: WidgetProps) {
  const { schema, id, value, onChange, disabled, readonly } = props
  
  const rows = (schema as any).properties?.rows?.default || []
  const columns = (schema as any).properties?.columns?.default || []
  
  const currentValues = value || {}

  const handleToggle = (row: string, col: string, checked: boolean) => {
    const rowValues = currentValues[row] || []
    let updatedRowValues: string[]
    
    if (checked) {
      updatedRowValues = [...rowValues, col]
    } else {
      updatedRowValues = rowValues.filter((v: string) => v !== col)
    }
    
    onChange({ ...currentValues, [row]: updatedRowValues })
  }

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
                    <Checkbox
                      id={`${id}-${row}-${col}`}
                      checked={(currentValues[row] || []).includes(col)}
                      onCheckedChange={(checked) => {
                        handleToggle(row, col, checked as boolean)
                      }}
                      disabled={disabled || readonly}
                    />
                    <Label htmlFor={`${id}-${row}-${col}`} className="sr-only">
                      {col}
                    </Label>
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
