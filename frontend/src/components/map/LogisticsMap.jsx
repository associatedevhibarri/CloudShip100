import { useMemo, useState } from 'react'
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMapEvents } from 'react-leaflet'

function MapClickClear({ onClear }) {
  useMapEvents({
    click: () => onClear(),
  })
  return null
}

const typeColors = {
  vehicle: '#007BFF',
  depot: '#64748B',
  ship: '#0EA5E9',
  airplane: '#2563EB',
  cargo: '#94A3B8',
  zone: '#0EA5E9',
}

export function LogisticsMap({
  assets,
  zones = [],
  height = '420px',
  center = [-26.2, 28.0],
  zoom = 5,
  showLegend = true,
}) {
  const [selected, setSelected] = useState(null)
  const markers = useMemo(() => assets, [assets])

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)]">
      <div style={{ height }}>
        <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickClear onClear={() => setSelected(null)} />
          {zones
            .filter((zone) => Number.isFinite(zone.lat) && Number.isFinite(zone.lng))
            .map((zone) => (
              <Circle
                key={zone.id}
                center={[zone.lat, zone.lng]}
                radius={zone.radiusM || 25000}
                pathOptions={{
                  color: zone.active === false ? '#94A3B8' : '#007BFF',
                  fillColor: zone.active === false ? '#94A3B8' : '#007BFF',
                  fillOpacity: zone.active === false ? 0.04 : 0.12,
                  weight: 1.5,
                }}
              >
                <Popup>
                  <strong>{zone.name}</strong>
                  <div className="text-xs capitalize">{zone.type} geofence</div>
                  {zone.rule ? <div className="text-xs">{zone.rule}</div> : null}
                </Popup>
              </Circle>
            ))}
          {markers
            .filter((asset) => Number.isFinite(asset.lat) && Number.isFinite(asset.lng))
            .map((asset) => (
            <CircleMarker
              key={asset.id}
              center={[asset.lat, asset.lng]}
              radius={asset.type === 'depot' ? 8 : 10}
              pathOptions={{
                color: asset.status === 'returning' ? '#93C5FD' : typeColors[asset.type] || '#007BFF',
                fillColor:
                  asset.status === 'returning' ? '#93C5FD' : typeColors[asset.type] || '#007BFF',
                fillOpacity: asset.status === 'returning' ? 1 : 0.25,
                weight: 2,
              }}
              eventHandlers={{
                click: (e) => {
                  e.originalEvent.stopPropagation()
                  setSelected(asset)
                },
              }}
            >
              <Popup>
                <strong>{asset.label}</strong>
                <div className="capitalize text-xs">{asset.type}</div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {selected?.driver ? (
        <div className="pointer-events-none absolute left-4 top-4 z-[500] w-[min(100%,280px)] rounded-2xl border border-line bg-white p-4 shadow-lg">
          <p className="text-sm font-extrabold text-ink">{selected.label}</p>
          <dl className="mt-2 space-y-1 text-xs text-muted">
            <div className="flex justify-between gap-3">
              <dt>Driver</dt>
              <dd className="font-semibold text-ink">{selected.driver}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Payload</dt>
              <dd className="font-semibold text-ink">{selected.payload}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Distance</dt>
              <dd className="font-semibold text-ink">{selected.distance}</dd>
            </div>
            <div>
              <dt className="mb-0.5">Collection</dt>
              <dd className="font-semibold text-ink">{selected.collection}</dd>
            </div>
            <div>
              <dt className="mb-0.5">Delivery</dt>
              <dd className="font-semibold text-ink">{selected.delivery}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      {showLegend ? (
        <div className="absolute bottom-4 right-4 z-[500] rounded-xl border border-line bg-white/95 px-3 py-2 text-xs font-semibold shadow">
          <div className="mb-1 flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-brand bg-transparent" />
            Dispatched
          </div>
          <div className="mb-1 flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full border border-brand bg-brand/20" />
            Geofence
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-sky-300" />
            Returning
          </div>
        </div>
      ) : null}
    </div>
  )
}
