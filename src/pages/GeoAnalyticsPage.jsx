import { api } from '../services/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'

export default function GeoAnalyticsPage() {
  const routes = api.getRouteOptimization()
  const weather = api.getWeatherAnalytics()

  return (
    <div>
      <PageHeader
        title="GeoSpatial Analytics"
        subtitle="Route optimization and weather impact on logistics corridors."
      />
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 font-extrabold">Route optimization</h3>
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
          />
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-extrabold">Weather analytics</h3>
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
        </Card>
      </div>
    </div>
  )
}
