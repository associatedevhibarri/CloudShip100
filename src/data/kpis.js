export const kpis = {
  totalRevenue: { value: 24580, change: 12, label: 'from last month', prefix: '$' },
  deliveries: { value: 1245, change: 8, label: 'growth' },
  newCustomers: { value: 320, change: 5, label: 'this week' },
  traffic: { value: 4.8, change: 12, label: 'increase', suffix: '%' },
}

export const activitySeries = [
  { month: 'Jan', road: 2100, air: 1200, maritime: 800 },
  { month: 'Feb', road: 2400, air: 1400, maritime: 900 },
  { month: 'Mar', road: 2800, air: 1600, maritime: 1100 },
  { month: 'Apr', road: 3200, air: 1800, maritime: 1300 },
  { month: 'May', road: 3000, air: 2100, maritime: 1500 },
  { month: 'Jun', road: 3500, air: 2300, maritime: 1700 },
  { month: 'Jul', road: 3800, air: 2500, maritime: 1900 },
]

export const lostBookings = [
  { name: 'Traffic Delay', value: 30.5, color: '#007BFF' },
  { name: 'Collection Drop', value: 29.8, color: '#4DA3FF' },
  { name: 'Location Not Found', value: 21.1, color: '#94A3B8' },
  { name: 'Demurrage', value: 11.5, color: '#CBD5E1' },
  { name: 'Other', value: 7.1, color: '#E2E8F0' },
]

export const lostBookingsTotal = 110
