const COUNTRY_ALIASES = {
  za: 'ZA',
  'south africa': 'ZA',
  rsa: 'ZA',
  us: 'US',
  usa: 'US',
  'united states': 'US',
  gb: 'GB',
  uk: 'GB',
  'united kingdom': 'GB',
}

export const emptyPickupAddress = {
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'ZA',
  buildingType: '',
}

export function formatPickupAddress(parts = {}) {
  return [parts.street, parts.city, parts.state, parts.postalCode, parts.country]
    .map((bit) => String(bit || '').trim())
    .filter(Boolean)
    .join(', ')
}

export function parsePickupAddress(raw) {
  if (raw && typeof raw === 'object' && (raw.street || raw.city || raw.address)) {
    const fromFields = {
      street: raw.street || '',
      city: raw.city || '',
      state: raw.state || '',
      postalCode: raw.postalCode || '',
      country: raw.country || 'ZA',
      buildingType: raw.buildingType || '',
    }
    if (fromFields.street || fromFields.city) return fromFields
    return parsePickupAddress(raw.address || '')
  }

  const parts = String(raw || '')
    .split(',')
    .map((bit) => bit.trim())
    .filter(Boolean)
  const parsed = { ...emptyPickupAddress }
  if (!parts.length) return parsed

  const last = parts[parts.length - 1].toLowerCase()
  if (COUNTRY_ALIASES[last] || /^[a-z]{2}$/.test(last)) {
    parsed.country = COUNTRY_ALIASES[last] || parts[parts.length - 1].toUpperCase()
    parts.pop()
  }

  if (parts.length) {
    const stateZip = parts[parts.length - 1].match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/)
    if (stateZip) {
      parsed.state = stateZip[1].toUpperCase()
      parsed.postalCode = stateZip[2]
      parts.pop()
    }
  }

  if (parts.length && /^\d{4,6}(?:-\d{4})?$/.test(parts[parts.length - 1])) {
    parsed.postalCode = parts.pop()
  }

  if (parts.length && /^[A-Za-z]{2}$/.test(parts[parts.length - 1])) {
    parsed.state = parts.pop().toUpperCase()
    if (parts.length && /^\d{4,6}(?:-\d{4})?$/.test(parts[parts.length - 1])) {
      parsed.postalCode = parts.pop()
    }
  }

  if (parts.length > 1) {
    parsed.city = parts.pop()
    parsed.street = parts.join(', ')
  } else if (parts.length === 1) {
    parsed.city = parts[0]
  }
  return parsed
}
