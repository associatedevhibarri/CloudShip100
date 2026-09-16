import { useState } from 'react'
import { Card } from './Card'

export function AddRecordForm({ title = 'Add record', fields, onSubmit, submitLabel = 'Save' }) {
  const initial = () => Object.fromEntries(fields.map((field) => [field.name, '']))
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const body = {}
      fields.forEach((field) => {
        const raw = form[field.name]
        if (field.type === 'number') {
          body[field.name] = raw === '' ? null : Number(raw)
        } else {
          body[field.name] = typeof raw === 'string' ? raw.trim() : raw
        }
      })
      await onSubmit(body)
      setForm(initial())
    } catch (err) {
      setError(err.message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="mb-4 p-4">
      <h3 className="mb-3 text-sm font-extrabold text-ink">{title}</h3>
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:items-end">
        {fields.map((field) => (
          <label key={field.name} className="text-sm">
            <span className="mb-1 block font-semibold text-ink">{field.label}</span>
            <input
              required={field.required !== false}
              type={field.inputType || (field.type === 'number' ? 'number' : 'text')}
              step={field.type === 'number' ? 'any' : undefined}
              value={form[field.name]}
              onChange={(e) => setForm((prev) => ({ ...prev, [field.name]: e.target.value }))}
              placeholder={field.placeholder || ''}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
            />
          </label>
        ))}
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:opacity-60"
        >
          {saving ? 'Saving...' : submitLabel}
        </button>
      </form>
      {error ? <p className="mt-2 text-sm font-semibold text-rose-700">{error}</p> : null}
    </Card>
  )
}
