import { formInputClass } from './FormField'

export function PickupAddressFields({ idPrefix, value, onChange }) {
  const set = (key) => (e) => onChange({ ...value, [key]: e.target.value })
  return (
    <div className="grid gap-2 sm:grid-cols-6">
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
        value={value.country || 'ZA'}
        onChange={set('country')}
      >
        <option value="ZA">South Africa</option>
        <option value="US">United States</option>
        <option value="GB">United Kingdom</option>
        <option value="DE">Germany</option>
        <option value="NL">Netherlands</option>
      </select>
    </div>
  )
}
