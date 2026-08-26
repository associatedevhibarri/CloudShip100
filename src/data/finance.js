export const wallet = {
  balance: 128450,
  currency: 'USD',
  pendingPayouts: 22400,
  monthlyEarnings: 58200,
  transactions: [
    { id: 'TX-01', label: 'Customer settlement — AfriMetals', amount: 12500, type: 'credit', date: '2026-08-24' },
    { id: 'TX-02', label: 'Fuel card batch', amount: -14880, type: 'debit', date: '2026-08-24' },
    { id: 'TX-03', label: 'Air cargo invoice — Zambezi', amount: 9200, type: 'credit', date: '2026-08-23' },
    { id: 'TX-04', label: 'Yard fees — City Deep', amount: -3400, type: 'debit', date: '2026-08-22' },
    { id: 'TX-05', label: 'Maritime freight — Maputo', amount: 15400, type: 'credit', date: '2026-08-20' },
  ],
}

export const earnings = [
  { month: 'Feb', road: 32000, air: 18000, maritime: 12000 },
  { month: 'Mar', road: 35000, air: 21000, maritime: 14000 },
  { month: 'Apr', road: 38000, air: 19000, maritime: 16000 },
  { month: 'May', road: 41000, air: 24000, maritime: 15000 },
  { month: 'Jun', road: 39000, air: 26000, maritime: 18000 },
  { month: 'Jul', road: 44000, air: 28000, maritime: 20000 },
]

export const notifications = [
  {
    id: 'NT-01',
    title: 'Trip TRP-1002 starting soon',
    body: 'Thandi Nkosi departs Cape Town in 2 hours.',
    time: '10 min ago',
    type: 'trip',
    unread: true,
  },
  {
    id: 'NT-02',
    title: 'Licence expiry warning',
    body: 'Johan van Wyk licence expires 20 Sep 2026.',
    time: '1 hr ago',
    type: 'compliance',
    unread: true,
  },
  {
    id: 'NT-03',
    title: 'Geofence entry',
    body: 'XYX 767 GP entered Gauteng Priority zone.',
    time: '2 hr ago',
    type: 'geo',
    unread: false,
  },
  {
    id: 'NT-04',
    title: 'Weather advisory',
    body: 'Heavy rain risk on KZN Coast corridor.',
    time: '3 hr ago',
    type: 'weather',
    unread: false,
  },
  {
    id: 'NT-05',
    title: 'Invoice paid',
    body: 'INV-4402 settled by Zambezi Retail Group.',
    time: 'Yesterday',
    type: 'finance',
    unread: false,
  },
]
