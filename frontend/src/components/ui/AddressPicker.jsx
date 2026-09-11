import { useEffect, useId, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { portalService } from '../../services/portalService'
import { formatPickupAddress } from '../../utils/pickupAddress'

const newSessionToken = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cs-${Date.now()}`

export function AddressPicker({
  id,
  value,
  onChange,
  onSelect,
  placeholder = 'Search street, city, postal code',
  className = '',
  required = false,
  disabled = false,
  onBlur,
}) {
  const listId = useId()
  const rootRef = useRef(null)
  const sessionRef = useRef(newSessionToken())
  const seqRef = useRef(0)
  const pickedRef = useRef('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [suggestions, setSuggestions] = useState([])
  const [configured, setConfigured] = useState(true)

  useEffect(() => {
    const query = String(value || '').trim()
    if (!query || query === pickedRef.current || query.length < 3) {
      setSuggestions([])
      return undefined
    }
    const seq = seqRef.current + 1
    seqRef.current = seq
    const timer = setTimeout(() => {
      portalService
        .suggestAddresses(query, { sessionToken: sessionRef.current })
        .then((result) => {
          if (seqRef.current !== seq) return
          setConfigured(result.configured !== false)
          setSuggestions(result.suggestions || [])
          setActive(0)
          setOpen(Boolean((result.suggestions || []).length))
        })
        .catch(() => {
          if (seqRef.current !== seq) return
          setSuggestions([])
        })
    }, 280)
    return () => clearTimeout(timer)
  }, [value])

  useEffect(() => {
    const onDoc = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const pick = async (row) => {
    if (!row?.placeId) return
    try {
      const details = await portalService.getAddressDetails(row.placeId, { sessionToken: sessionRef.current })
      sessionRef.current = newSessionToken()
      const formatted = details.formatted || formatPickupAddress(details) || row.description
      pickedRef.current = formatted
      onChange?.(formatted)
      onSelect?.(details)
      setSuggestions([])
      setOpen(false)
    } catch {
      pickedRef.current = row.description
      onChange?.(row.description)
      onSelect?.({ formatted: row.description })
      setOpen(false)
    }
  }

  const onKeyDown = (event) => {
    if (!open || !suggestions.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => (index + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => (index - 1 + suggestions.length) % suggestions.length)
    } else if (event.key === 'Enter' && suggestions[active]) {
      event.preventDefault()
      pick(suggestions[active])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <MapPin size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          id={id}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          required={required}
          disabled={disabled}
          value={value}
          placeholder={placeholder}
          className={`${className} pl-8`}
          onChange={(e) => {
            pickedRef.current = ''
            onChange?.(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (suggestions.length) setOpen(true)
          }}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
        />
      </div>
      {open && suggestions.length ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-line bg-white py-1 shadow-[var(--shadow-card)]"
        >
          {suggestions.map((row, index) => (
            <li key={row.placeId}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                className={`flex w-full flex-col px-3 py-2 text-left text-sm ${
                  index === active ? 'bg-brand-light text-ink' : 'text-ink hover:bg-surface'
                }`}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(row)}
              >
                <span className="font-semibold">{row.mainText}</span>
                {row.secondaryText ? <span className="text-xs text-muted">{row.secondaryText}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {!configured ? (
        <p className="mt-1 text-[11px] text-muted">Type a full street address. Google Places is not configured.</p>
      ) : null}
    </div>
  )
}
