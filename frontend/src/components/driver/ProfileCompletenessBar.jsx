import { AlertCircle, CheckCircle2, Sparkles } from 'lucide-react'
import { Card } from '../ui/Card'

export function ProfileCompletenessBar({ completeness, onMissingClick }) {
  if (!completeness) return null

  const { percentage, missingFields, missingKeys, isComplete } = completeness
  const tone =
    percentage >= 100 ? 'bg-emerald-500' : percentage >= 60 ? 'bg-brand' : 'bg-amber-500'
  const ringTone =
    percentage >= 100
      ? 'from-emerald-500/20 to-emerald-500/5'
      : percentage >= 60
        ? 'from-brand/20 to-brand/5'
        : 'from-amber-500/20 to-amber-500/5'

  return (
    <Card className="mb-6 overflow-hidden p-0">
      <div className={`bg-gradient-to-r ${ringTone} px-5 py-4`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-muted">
              <Sparkles size={14} className="text-brand" />
              Compliance checklist
            </p>
            <p className="mt-2 flex items-center gap-2 text-xl font-extrabold text-ink">
              {isComplete ? (
                <>
                  <CheckCircle2 size={22} className="text-emerald-600" />
                  Profile ready for dispatch
                </>
              ) : (
                <>
                  <AlertCircle size={22} className="text-amber-600" />
                  {percentage}% profile complete
                </>
              )}
            </p>
            <p className="mt-1 max-w-lg text-sm text-muted">
              {isComplete
                ? 'All required details and documents are on file.'
                : 'Complete the items below to unlock full driver portal access.'}
            </p>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/60 bg-white/80 text-lg font-extrabold text-brand shadow-sm">
            {percentage}%
          </div>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/70 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${tone}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {!isComplete && missingFields?.length ? (
        <div className="border-t border-line/70 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Action required</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {missingFields.map((field, index) => (
              <li key={field}>
                <button
                  type="button"
                  onClick={() => onMissingClick?.(missingKeys?.[index], field)}
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:border-amber-300 hover:bg-amber-100"
                >
                  {field}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  )
}
