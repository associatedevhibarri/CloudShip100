import { Check } from 'lucide-react'
import { progressTimeline } from '../../utils/shipmentProgress'

export function TransitTimeline({ timeline, status }) {
  const steps = progressTimeline(timeline, status)
  return (
    <ol className="flex w-full items-start gap-0 overflow-x-auto pt-1">
      {steps.map((step, i) => {
        const lineDone = step.done && steps[i + 1]?.done
        return (
          <li key={step.stage} className="flex min-w-0 flex-1 items-start last:flex-none last:min-w-[4.5rem]">
            <div className="flex min-w-0 flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${
                  step.done ? 'border-brand bg-brand text-white' : 'border-line bg-white text-muted'
                }`}
              >
                {step.done ? <Check size={14} /> : i + 1}
              </div>
              <p
                className={`mt-1.5 max-w-[5.5rem] text-center text-[11px] font-semibold leading-tight ${
                  step.done ? 'text-ink' : 'text-muted'
                }`}
              >
                {step.label}
              </p>
              {step.timestamp ? (
                <p className="mt-0.5 text-[10px] text-muted">{String(step.timestamp).slice(0, 10)}</p>
              ) : null}
            </div>
            {i < steps.length - 1 ? (
              <div className={`mx-1 mt-4 h-0.5 min-w-[1.25rem] flex-1 ${lineDone ? 'bg-brand' : 'bg-line'}`} />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
