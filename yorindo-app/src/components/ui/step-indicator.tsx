import { cn } from '@/lib/utils'

interface StepIndicatorProps {
  steps: string[]
  currentStep: number // 0-indexed
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      {steps.map((label, i) => (
        <div key={i} className="flex flex-col items-center flex-1">
          <div className="flex items-center w-full">
            {/* connector line before */}
            {i > 0 && (
              <div className={cn('flex-1 h-px', i <= currentStep ? 'bg-primary' : 'bg-border')} />
            )}
            {/* circle */}
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0',
                i < currentStep && 'bg-primary/60 text-primary-foreground',
                i === currentStep && 'bg-primary text-primary-foreground',
                i > currentStep && 'border border-muted-foreground text-muted-foreground',
              )}
            >
              {i < currentStep ? '✓' : i + 1}
            </div>
            {/* connector line after */}
            {i < steps.length - 1 && (
              <div className={cn('flex-1 h-px', i < currentStep ? 'bg-primary' : 'bg-border')} />
            )}
          </div>
          <span
            className={cn(
              'text-[10px] mt-1 text-center leading-tight',
              i === currentStep ? 'text-foreground font-medium' : 'text-muted-foreground',
            )}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}
