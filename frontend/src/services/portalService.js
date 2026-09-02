const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1'

async function request(path, { token, method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return null
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Request failed')
  }
  return data
}

export const portalService = {
  getMyCompany: (token) => request('/companies/me', { token }),
  updateMyCompany: (token, body) => request('/companies/me', { token, method: 'PATCH', body }),
  getMyBookings: (token) => request('/bookings/mine', { token }),
  getMyInvoices: (token) => request('/invoices/mine', { token }),
  getMyContracts: (token) => request('/contracts/mine', { token }),
  getMyKycDocuments: (token) => request('/kyc-documents/mine', { token }),
  uploadKycDocument: (token, body) => request('/kyc-documents/mine', { token, method: 'POST', body }),
  getMyPaymentRequests: (token) => request('/payment-requests/mine', { token }),
  payPaymentRequest: (token, id) => request(`/payment-requests/${id}/pay`, { token, method: 'PATCH' }),
  getMyNotifications: (token) => request('/notifications/mine', { token }),
  getPromotions: (token) => request('/promotions', { token }),
  getQuote: (body) => request('/pricing/quote', { method: 'POST', body }),
  createBooking: (token, body) => request('/bookings', { token, method: 'POST', body }),
}
