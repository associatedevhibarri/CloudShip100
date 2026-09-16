import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { DEMO_REASONS, PageHeader, DemoDataNote } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { ErrorState, LoadingState } from '../components/ui/LoadingState'

export default function GeoAnalyticsPage() {
  const [routes, setRoutes] = useState([])
  const [weather, setWeather] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const [routeRows, weatherRows] = await Promise.all([
          api.getRouteOptimization(),
          api.getWeatherAnalytics(),
        ])
        if (cancelled) return
        setRoutes(Array.isArray(routeRows) ? routeRows : [])
        setWeather(Array.isArray(weatherRows) ? weatherRows : [])
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load routes')
          setRoutes([])
          setWeather([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <LoadingState label="Loading geo analytics..." />

  return (
    <div>
      <PageHeader
        title="GeoSpatial Analytics"
        subtitle="Warehouse route optimisation. Weather needs an external weather API."
        actions={
          <Link to="/app/warehouse/routes" className="text-sm font-bold text-brand hover:underline">
            Warehouse route optimisation →
          </Link>
        }
      />
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 font-extrabold">Route optimization</h3>
          {routes.length === 0 && !error ? (
            <p className="text-sm text-muted">No warehouse routes yet.</p>
          ) : (
            <DataTable
              columns={[
                { key: 'route', label: 'Route' },
                { key: 'baselineHrs', label: 'Baseline (h)' },
                { key: 'optimizedHrs', label: 'Optimized (h)' },
                {
                  key: 'fuelSavePct',
                  label: 'Fuel save',
                  render: (r) => `${r.fuelSavePct}%`,
                },
              ]}
              rows={routes}
              rowKey="id"
            />
          )}
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <h3 className="font-extrabold">Weather analytics</h3>
            <DemoDataNote>{DEMO_REASONS.weather}</DemoDataNote>
          </div>
          {weather.length === 0 ? (
            <p className="text-sm text-muted">No weather feed connected yet. Live GPS and weather stay pending external APIs.</p>
          ) : (
          <ul className="space-y-3">
            {weather.map((w) => (
              <li key={w.region} className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold">{w.region}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                      w.severity === 'high'
                        ? 'bg-rose-50 text-rose-700'
                        : w.severity === 'medium'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {w.severity}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink">{w.condition}</p>
                <p className="text-xs text-muted">{w.impact}</p>
              </li>
            ))}
          </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
