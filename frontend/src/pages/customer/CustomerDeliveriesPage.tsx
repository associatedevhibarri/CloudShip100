import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Card } from '../../components/ui/Card'

export default function CustomerDeliveriesPage() {
    const deliveries = api.getOrders().filter((o) => o.customer === 'AfriMetals Pty')

    return (
        <div>
            <PageHeader
                title="My Deliveries"
                subtitle="Track pending, in-transit, and completed shipments."
                actions={[]}
            />
            <div className="space-y-3">
                {deliveries.map((d) => (
                    <Card key={d.id} className="p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-bold text-brand">{d.id}</p>
                                <h3 className="mt-1 text-lg font-extrabold">{d.cargo}</h3>
                                <p className="mt-1 text-sm text-muted">
                                    {d.pickup} → {d.dropoff}
                                </p>
                            </div>
                            <StatusBadge status={d.status} />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-4 text-sm">
                            <span className="rounded-full bg-surface px-3 py-1 font-semibold">{d.mode}</span>
                            <span className="font-semibold text-ink">${d.value.toLocaleString()}</span>
                            <span className="text-muted">Created {d.createdAt}</span>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}