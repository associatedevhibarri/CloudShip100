import { useMemo } from 'react'
import { MapContainer, TileLayer, Circle, CircleMarker, Popup, useMapEvents } from 'react-leaflet'

function MapClickCapture({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

/**
 * Leaflet map for geomapping radius rules.
 * Click sets form lat/lng; circles show existing radius scopes.
 */
export function GeofenceMap({
  geofences = [],
  height = '360px',
  center = [-26.2, 28.0],
  zoom = 5,
  draft,
  onMapClick,
}) {
  const radiusRules = useMemo(
    () =>
      geofences.filter(
        (g) => g.scope === 'radius' && g.lat != null && g.lng != null && g.radiusKm != null && g.active !== false,
      ),
    [geofences],
  )

  const pinRules = useMemo(
    () => geofences.filter((g) => g.scope !== 'radius' && g.lat != null && g.lng != null),
    [geofences],
  )

  const mapCenter = useMemo(() => {
    if (draft?.lat != null && draft?.lng != null) return [Number(draft.lat), Number(draft.lng)]
    const first = radiusRules[0]
    if (first) return [first.lat, first.lng]
    return center
  }, [draft, radiusRules, center])

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)]">
      <div style={{ height }}>
        <MapContainer center={mapCenter} zoom={zoom} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickCapture onMapClick={onMapClick} />

          {radiusRules.map((g) => (
            <Circle
              key={g.id}
              center={[g.lat, g.lng]}
              radius={Number(g.radiusKm) * 1000}
              pathOptions={{
                color: '#007BFF',
                fillColor: '#007BFF',
                fillOpacity: 0.12,
                weight: 2,
              }}
            >
              <Popup>
                <strong>{g.name}</strong>
                <div className="text-xs">
                  {g.radiusKm} km · {g.rule}
                </div>
                {g.exclusions?.length ? (
                  <div className="mt-1 text-xs text-rose-600">Exclusions: {g.exclusions.join(', ')}</div>
                ) : null}
              </Popup>
            </Circle>
          ))}

          {pinRules.map((g) => (
            <CircleMarker
              key={g.id}
              center={[g.lat, g.lng]}
              radius={8}
              pathOptions={{ color: '#64748B', fillColor: '#64748B', fillOpacity: 0.35, weight: 2 }}
            >
              <Popup>
                <strong>{g.name}</strong>
                <div className="text-xs capitalize">
                  {g.scope} · {g.region}
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {draft?.lat !== '' &&
          draft?.lng !== '' &&
          draft?.lat != null &&
          draft?.lng != null &&
          !Number.isNaN(Number(draft.lat)) &&
          !Number.isNaN(Number(draft.lng)) ? (
            <>
              <CircleMarker
                center={[Number(draft.lat), Number(draft.lng)]}
                radius={9}
                pathOptions={{ color: '#059669', fillColor: '#10B981', fillOpacity: 0.5, weight: 2 }}
              >
                <Popup>New rule center</Popup>
              </CircleMarker>
              {draft.scope === 'radius' && draft.radiusKm !== '' && Number(draft.radiusKm) > 0 ? (
                <Circle
                  center={[Number(draft.lat), Number(draft.lng)]}
                  radius={Number(draft.radiusKm) * 1000}
                  pathOptions={{
                    color: '#059669',
                    fillColor: '#10B981',
                    fillOpacity: 0.08,
                    weight: 2,
                    dashArray: '6 6',
                  }}
                />
              ) : null}
            </>
          ) : null}
        </MapContainer>
      </div>
      <p className="border-t border-line bg-surface px-3 py-2 text-xs text-muted">
        Click the map to set latitude / longitude for a new rule. Blue circles = saved radius geofences.
      </p>
    </div>
  )
}
