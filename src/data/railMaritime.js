export const railSidings = [
  { id: 'RS-01', name: 'City Deep Siding', location: 'Johannesburg, SA', tracks: 8, status: 'Active' },
  { id: 'RS-02', name: 'Durban Rail Siding', location: 'Durban, SA', tracks: 12, status: 'Active' },
  { id: 'RS-03', name: 'Maputo Link Siding', location: 'Maputo, Mozambique', tracks: 4, status: 'Limited' },
]

export const locomotives = [
  { id: 'LOC-01', name: 'CS Class 43', yard: 'City Deep', power: '3,000 HP', status: 'In Service' },
  { id: 'LOC-02', name: 'CS Class 21E', yard: 'Durban Rail', power: '4,200 HP', status: 'In Service' },
  { id: 'LOC-03', name: 'CS Class 18E', yard: 'City Deep', power: '2,800 HP', status: 'Maintenance' },
]

export const railYards = [
  { id: 'RY-01', name: 'City Deep Rail Yard', location: 'Gauteng, SA', capacity: '220 wagons' },
  { id: 'RY-02', name: 'Bayhead Rail Yard', location: 'Durban, SA', capacity: '310 wagons' },
]

export const ports = [
  {
    id: 'PRT-01',
    name: 'Port of Durban',
    country: 'South Africa',
    berths: 58,
    status: 'Operational',
    lat: -29.87,
    lng: 31.04,
  },
  {
    id: 'PRT-02',
    name: 'Port of Cape Town',
    country: 'South Africa',
    berths: 34,
    status: 'Operational',
    lat: -33.91,
    lng: 18.43,
  },
  {
    id: 'PRT-03',
    name: 'Port of Maputo',
    country: 'Mozambique',
    berths: 18,
    status: 'Operational',
    lat: -25.97,
    lng: 32.55,
  },
]
