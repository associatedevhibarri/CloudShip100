import { useState } from 'react'
import { formInputClass } from './FormField'
import { AddressPicker } from './AddressPicker'
import { formatPickupAddress } from '../../utils/pickupAddress'

const COUNTRIES = [
  { value: 'ZA', label: 'South Africa' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'IN', label: 'India' },
]

export function PickupAddressFields({ idPrefix, value, onChange }) {
  const [search, setSearch] = useState('')
  const set = (key) => (e) => onChange({ ...value, [key]: e.target.value })
  const country = value.country || 'ZA'
  const knownCountry = COUNTRIES.some((row) => row.value === country)

  return (
    <div className="grid gap-2 sm:grid-cols-6">
      <div className="sm:col-span-6">
        <AddressPicker
          id={`${idPrefix}-search`}
          value={search}
          onChange={setSearch}
          onSelect={(details) => {
            onChange({
              ...value,
              street: details.street || value.street,
              city: details.city || value.city,
              state: details.state || value.state,
              postalCode: details.postalCode || value.postalCode,
              country: details.country || value.country || 'ZA',
            })
            setSearch(details.formatted || formatPickupAddress(details) || search)
          }}
          placeholder="Search Google address"
          className={formInputClass()}
        />
      </div>
      <input
        id={`${idPrefix}-street`}
        className={`${formInputClass()} sm:col-span-6`}
        placeholder="Street and number"
        value={value.street || ''}
        onChange={set('street')}
        autoComplete="street-address"
      />
      <input
        id={`${idPrefix}-city`}
        className={`${formInputClass()} sm:col-span-2`}
        placeholder="City"
        value={value.city || ''}
        onChange={set('city')}
        autoComplete="address-level2"
      />
      <input
        id={`${idPrefix}-state`}
        className={`${formInputClass()} sm:col-span-1`}
        placeholder="Province"
        value={value.state || ''}
        onChange={set('state')}
        autoComplete="address-level1"
      />
      <input
        id={`${idPrefix}-postal`}
        className={`${formInputClass()} sm:col-span-1`}
        placeholder="Postal"
        value={value.postalCode || ''}
        onChange={set('postalCode')}
        autoComplete="postal-code"
      />
      <select
        id={`${idPrefix}-country`}
        className={`${formInputClass()} sm:col-span-2`}
        value={country}
        onChange={set('country')}
      >
        {COUNTRIES.map((row) => (
          <option key={row.value} value={row.value}>
            {row.label}
          </option>
        ))}
        {!knownCountry && country ? <option value={country}>{country}</option> : null}
      </select>
      <select
        id={`${idPrefix}-building-type`}
        className={`${formInputClass()} sm:col-span-6`}
        value={value.buildingType || 'RESIDENTIAL'}
        onChange={set('buildingType')}
      >
        <option value="RESIDENTIAL">🏠 Residential (House / Apartment / Estate)</option>
        <option value="COMMERCIAL">🏬 Commercial (Office / Retail Store / Mall)</option>
        <option value="INDUSTRIAL">🏭 Industrial (Warehouse / Factory / Hub)</option>
        <option value="MINING_FACILITY">⛏️ Mining Facility (Mining site / Yard)</option>
        <option value="FARM">🚜 Agricultural (Farm / Small Hold / Silo)</option>
        <option value="STORAGE">📦 Storage (Container storage / Bonded warehouse)</option>
        <option value="CONSTRUCTION_SITE_OFFICE">🏗️ Temporary / Construction Site</option>
      </select>
    </div>
  )
}
