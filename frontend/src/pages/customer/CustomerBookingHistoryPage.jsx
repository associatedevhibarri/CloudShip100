import { useState } from 'react'
import { portalService } from '../../services/portalService'
import { usePortalFetch } from '../../hooks/usePortalFetch'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { FilterBar, FilterButton } from '../../components/ui/FilterBar'
import { LoadingState, ErrorState } from '../../components/ui/LoadingState'

export default function CustomerBookingHistoryPage() {
  const { data: bookings, loading, error } = usePortalFetch(portalService.getMyBookings)
  const [mode, setMode] = useState('All')

  if (loading) return <LoadingState label="Loading your booking history..." />
  if (error) return <ErrorState message={error} />

  const bookingList = bookings || []
  const modes = ['All', ...new Set(bookingList.map((b) => b.mode))]
  const rows = mode === 'All' ? bookingList : bookingList.filter((b) => b.mode === mode)

  return (
    <div>
      <PageHeader title="Booking History" subtitle="Every shipment booked by your company." />

      {bookingList.length === 0 ? (
        <Card className="p-6 text-sm text-muted">No bookings yet.</Card>
      ) : (
        <>
          <FilterBar>
            {modes.map((m) => (
              <FilterButton key={m} active={mode === m} onClick={() => setMode(m)}>
                {m}
              </FilterButton>
            ))}
          </FilterBar>

          <DataTable
            columns={[
              { key: 'code', label: 'Booking', render: (row) => row.code || row.id },
              { key: 'cargo', label: 'Cargo' },
              { key: 'mode', label: 'Mode' },
              { key: 'pickup', label: 'Pickup' },
              { key: 'dropoff', label: 'Dropoff' },
              { key: 'value', label: 'Value', render: (row) => `$${row.value.toLocaleString()}` },
              { key: 'bookedAt', label: 'Booked', render: (row) => row.bookedAt?.slice(0, 10) },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            ]}
            rows={rows}
          />
        </>
      )}
    </div>
  )
}
