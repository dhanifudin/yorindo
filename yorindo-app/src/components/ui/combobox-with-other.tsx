'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface ComboboxWithOtherProps {
  options: { value: string; label: string }[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  otherLabel?: string
  disabled?: boolean
  className?: string
}

/**
 * Combobox with an "Other" option that reveals a free-text input.
 * When "Other" is selected, the popover closes and a text input appears below.
 * The free-text value is passed back through `onValueChange`.
 */
export function ComboboxWithOther({
  options,
  value,
  onValueChange,
  placeholder = 'Pilih opsi...',
  searchPlaceholder = 'Cari...',
  emptyText = 'Tidak ditemukan.',
  otherLabel = 'Lainnya...',
  disabled = false,
  className,
}: ComboboxWithOtherProps) {
  const [open, setOpen] = React.useState(false)
  const [isOther, setIsOther] = React.useState(false)
  const [customValue, setCustomValue] = React.useState('')

  // Track whether the current value is a standard option or custom
  React.useEffect(() => {
    const isStandard = options.some((o) => o.value === value)
    setIsOther(!isStandard && value !== '')
    if (isStandard) setCustomValue('')
    else if (!isStandard && value) setCustomValue(value)
    else setCustomValue('')
  }, [value, options])

  const selected = options.find((o) => o.value === value)

  const handleSelect = (optionValue: string) => {
    if (optionValue === '__other__') {
      setIsOther(true)
      onValueChange('')
      setOpen(false)
    } else {
      setIsOther(false)
      setCustomValue('')
      onValueChange(optionValue === value ? '' : optionValue)
      setOpen(false)
    }
  }

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomValue(e.target.value)
    onValueChange(e.target.value)
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn('w-full justify-between font-normal', className)}
          >
            <span className={cn('truncate', !selected?.value && !isOther && 'text-muted-foreground')}>
              {isOther ? (customValue || otherLabel) : (selected?.label ?? placeholder)}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === option.value ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  value="__other__"
                  onSelect={() => handleSelect('__other__')}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      isOther ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="italic text-muted-foreground">{otherLabel}</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {isOther && (
        <Input
          value={customValue}
          onChange={handleCustomChange}
          placeholder="Ketik nilai lainnya..."
          className="h-9"
        />
      )}
    </div>
  )
}
